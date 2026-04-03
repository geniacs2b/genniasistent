import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { google } from "googleapis";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  buildCertificateEmail,
  type TenantBranding,
  type EmailSistemaConfig,
  type CertificateEmailData,
} from "@/lib/emailTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers MIME
// ─────────────────────────────────────────────────────────────────────────────

/** Codifica un asunto con caracteres no ASCII para cabeceras de correo. */
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

/** Construye un mensaje MIME multipart/mixed con HTML + adjunto PDF. */
function buildMimeMessage(opts: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const htmlBase64 = Buffer.from(opts.htmlBody, 'utf-8').toString('base64');
  const pdfBase64  = opts.pdfBuffer.toString('base64');

  const lines = [
    `MIME-Version: 1.0`,
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    // RFC 2822 exige líneas de máximo 76 caracteres en base64
    ...htmlBase64.match(/.{1,76}/g) ?? [],
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${opts.pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${opts.pdfFilename}"`,
    ``,
    ...pdfBase64.match(/.{1,76}/g) ?? [],
    ``,
    `--${boundary}--`,
  ];

  return lines.join('\r\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler principal
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req: NextRequest) {
  let active_delivery_id: string | undefined;

  try {
    const { tenant_id, job_id, delivery_id } = await req.json();
    console.log(`[Worker Email] Recibido job ${job_id} para delivery ${delivery_id}`);

    active_delivery_id = delivery_id;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return ''; } } },
    );

    // 1. Obtener delivery — verificar que no esté ya procesado o fallado permanentemente
    // Schema real: to_email, attempts, last_error, sent_at (NO email_to, retry_count, error_log, dispatched_at)
    const { data: delivery } = await supabase
      .from('email_deliveries')
      .select('to_email, attempts, status, subject')
      .eq('id', delivery_id)
      .single();

    if (!delivery) {
      return NextResponse.json({ success: true, message: 'Delivery inexistente — omitido.' });
    }
    if (delivery.status === 'sent') {
      return NextResponse.json({ success: true, message: 'Ya enviado anteriormente.' });
    }
    if (delivery.status === 'failed') {
      // Error permanente ya registrado — no reintentar (retornar 200 para que QStash no reintente)
      console.warn(`[Worker Email] Delivery ${delivery_id} está marcado como failed permanente — no se reintenta.`);
      return NextResponse.json({ success: true, message: 'Error permanente registrado.' });
    }

    // 2. Obtener job con campos necesarios para el correo
    // codigo_certificado no existe en certificate_jobs — se deriva de job_id si se necesita
    const { data: job } = await supabase
      .from('certificate_jobs')
      .select('pdf_url, evento_id, participante_id')
      .eq('id', job_id)
      .single();

    if (!job?.pdf_url) {
      // Sin PDF no se puede enviar — error permanente
      await supabase.from('email_deliveries').update({
        status:     'failed',
        last_error: 'PDF no encontrado en el job — generación pudo haber fallado.',
        attempts:   (delivery.attempts ?? 0) + 1,
      }).eq('id', delivery_id);
      return NextResponse.json({ success: true, message: 'PDF no disponible — marcado como failed.' });
    }

    // 3. Credenciales OAuth del tenant
    const { data: oauthConfig } = await supabase
      .from('email_configurations')
      .select('refresh_token, sender_email, is_active')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();

    if (!oauthConfig?.refresh_token) {
      // Sin OAuth no se puede enviar — error permanente
      const msg = 'El Tenant no tiene una cuenta de Google conectada o está inactiva.';
      await supabase.from('email_deliveries').update({
        status:     'failed',
        last_error: msg,
        attempts:   (delivery.attempts ?? 0) + 1,
      }).eq('id', delivery_id);
      return NextResponse.json({ success: true, message: msg });
    }

    // 4. Datos de contexto para armar el correo
    const [tenantRes, configRes, eventoRes, personaRes] = await Promise.all([
      supabase.from('tenants').select('name, logo_url').eq('id', tenant_id).single(),
      supabase.from('configuracion_correo_sistema').select('*').eq('tenant_id', tenant_id).eq('activo', true).limit(1).single(),
      supabase.from('eventos').select('titulo, fecha_inicio, fecha_fin').eq('id', job.evento_id).single(),
      supabase.from('personas').select('nombre_completo, nombres, apellidos').eq('id', job.participante_id).single(),
    ]);

    const tenant   = tenantRes.data;
    const sysConf  = configRes.data  as EmailSistemaConfig | null;
    const evento   = eventoRes.data;
    const persona  = personaRes.data;

    const branding: TenantBranding = {
      name:     tenant?.name ?? 'Nuestra Organización',
      logo_url: tenant?.logo_url,
    };

    const nombreCompleto =
      persona?.nombre_completo?.trim() ||
      `${persona?.nombres ?? ''} ${persona?.apellidos ?? ''}`.trim() ||
      delivery.to_email;

    const publicBase = process.env.PUBLIC_BASE_URL || "https://genniasistent.vercel.app";
    const verificacionUrl = `${publicBase}/verificar?cert=${job_id}`;

    // Fecha del evento formateada para el correo (rango legible si hay dos fechas)
    let fechaEvento: string | undefined;
    if (evento?.fecha_inicio) {
      const fmt = (iso: string) => {
        const d = new Date(iso);
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
      };
      fechaEvento = evento.fecha_fin && evento.fecha_fin !== evento.fecha_inicio
        ? `${fmt(evento.fecha_inicio)} al ${fmt(evento.fecha_fin)}`
        : fmt(evento.fecha_inicio);
    }

    // codigo_certificado no existe en certificate_jobs — se deriva del job_id
    const codigoCert = `CERT-${job_id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    const emailData: CertificateEmailData = {
      nombre_completo:    nombreCompleto,
      nombre_evento:      evento?.titulo ?? 'Evento',
      fecha_evento:       fechaEvento,
      pdf_url:            job.pdf_url,
      codigo_certificado: codigoCert,
      verificacion_url:   verificacionUrl,
    };

    const asunto = evento?.titulo
      ? `Tu certificado de "${evento.titulo}" está listo`
      : `Certificado de participación`;

    const htmlBody = buildCertificateEmail(emailData, sysConf ?? {}, branding);

    // 5. Descargar el PDF para adjuntarlo
    console.log(`[Worker Email] Descargando PDF desde: ${job.pdf_url}`);
    let pdfBuffer: Buffer;
    try {
      const pdfResponse = await fetch(job.pdf_url);
      if (!pdfResponse.ok) {
        const errMsg = `HTTP ${pdfResponse.status} al descargar PDF`;
        // 404 = PDF eliminado del storage — error permanente
        if (pdfResponse.status === 404) {
          await supabase.from('email_deliveries').update({
            status:     'failed',
            last_error: `PDF no encontrado en Storage (404). URL: ${job.pdf_url}`,
            attempts:   (delivery.attempts ?? 0) + 1,
          }).eq('id', delivery_id);
          return NextResponse.json({ success: false, message: errMsg });
        }
        throw new Error(errMsg);
      }
      pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      console.log(`[Worker Email] PDF descargado — ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    } catch (fetchErr: any) {
      throw new Error(`❌ Error adjuntando PDF (job=${job_id}): ${fetchErr.message}`);
    }

    // 6. Construir y enviar mensaje MIME via Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${publicBase}/api/oauth/google/callback`,
    );
    oauth2Client.setCredentials({ refresh_token: oauthConfig.refresh_token });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const senderName  = sysConf?.nombre_remitente ?? branding.name;
    const senderEmail = oauthConfig.sender_email;

    const rawMime = buildMimeMessage({
      from:        `"${senderName}" <${senderEmail}>`,
      to:          delivery.to_email,
      subject:     asunto,
      htmlBody,
      pdfBuffer,
      pdfFilename: `certificado_${codigoCert.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
    });

    // Gmail requiere base64url (sin padding =)
    const rawBase64url = Buffer.from(rawMime).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`[Worker Email] Enviando correo a ${delivery.to_email} desde <${senderEmail}> (asunto: "${asunto}")`);
    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawBase64url },
      });
    } catch (gmailErr: any) {
      const httpCode   = gmailErr?.response?.status ?? gmailErr?.code ?? 0;
      const gmailMsg   = gmailErr?.response?.data?.error ?? gmailErr?.message ?? String(gmailErr);
      const errMessage = `❌ Error Gmail API (HTTP ${httpCode}): ${gmailMsg}`;

      // Errores permanentes: token revocado, permisos insuficientes, cuenta suspendida
      const PERMANENT_GMAIL_CODES = [400, 401, 403];
      const isPermanent = PERMANENT_GMAIL_CODES.includes(Number(httpCode)) ||
        String(gmailMsg).includes('invalid_grant') ||
        String(gmailMsg).includes('Token has been expired or revoked');

      if (isPermanent) {
        console.error(`[Worker Email] ❌ Error Gmail permanente (no reintentable): ${errMessage}`);
        await supabase.from('email_deliveries').update({
          status:     'failed',
          last_error: errMessage,
          attempts:   (delivery.attempts ?? 0) + 1,
        }).eq('id', delivery_id);
        // Retornar 200 para que QStash NO reintente
        return NextResponse.json({ success: false, message: errMessage });
      }

      throw new Error(errMessage); // retriable → QStash reintentará
    }

    console.log(`[Worker Email] ✅ Correo enviado a ${delivery.to_email} — Job ${job_id}`);

    // 7. Marcar como enviado — columnas reales: sent_at, last_error (NO dispatched_at, error_log)
    // Actualizamos antes de nada para asegurar que si algo falla después, el reintento sepa que ya se envió.
    const { error: updateError } = await supabase.from('email_deliveries').update({
      status:     'sent',
      sent_at:    new Date().toISOString(),
      last_error: null,
    }).eq('id', delivery_id);

    if (updateError) {
      console.warn(`[Worker Email] Error actualizando email_deliveries a 'sent': ${updateError.message}`);
    } else {
      console.log(`[Worker Email] email_deliveries ${delivery_id} → status='sent'`);
    }

    // 7b. Actualizar certificate_jobs a 'sent' y marcar email_sent=true (schema real)
    // NO incluir updated_at — columna no existe en certificate_jobs
    const { error: jobSentError } = await supabase.from('certificate_jobs').update({
      status:     'sent',
      email_sent: true,
    }).eq('id', job_id);

    if (jobSentError) {
      console.warn(`[Worker Email] Error actualizando job ${job_id} a 'sent': ${jobSentError.message}`);
      // No lanzamos — el correo ya fue enviado, este update es de trazabilidad
    } else {
      console.log(`[Worker Email] Job ${job_id} marcado como 'sent'.`);
    }

    // 8. SINCRONIZACIÓN CON TABLA LEGADA (Para Visibilidad en UI)
    try {
      const { data: inscripcion } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('evento_id', job.evento_id)
        .eq('persona_id', job.participante_id)
        .maybeSingle();

      if (inscripcion) {
        // Insertamos un registro de éxito para que el RPC obtener_estado_certificados_evento lo detecte
        await supabase.from('envios_correo').insert({
          evento_id:      job.evento_id,
          persona_id:     job.participante_id,
          inscripcion_id: inscripcion.id,
          estado:         'enviado',
          asunto_real:    asunto,
          sent_at:        new Date().toISOString(),
          proveedor_id:   'engine-v2', 
          metadata: {
             job_id: job_id,
             delivery_id: delivery_id,
             engine: 'native_v2'
          }
        });
      }
    } catch (syncErr: any) {
      console.error(`[Worker Email] Error en sincronización legada (no crítico): ${syncErr.message}`);
    }

    // 9. DESCONTAR CONSUMO REAL
    try {
      console.log(`[Worker Email] Aplicando descuento de cuota (-1) para tenant: ${tenant_id}`);
      await supabase.rpc('decrement_tenant_quota', { p_tenant_id: tenant_id, amount: 1 });
    } catch (quotaErr: any) {
      console.error(`[Worker Email] Error crítico descontando cuota: ${quotaErr.message}`);
      // No lanzamos error para no reintentar el envío del correo (que ya fue exitoso)
    }

    return NextResponse.json({ success: true, message: `Certificado enviado con éxito a ${delivery.to_email}` });

  } catch (error: any) {
    console.error(`[Worker Email] Error retriable (${error.message}) — QStash reintentará.`);

    if (active_delivery_id) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get() { return ''; } } },
      );

      // Leer attempts actual para decidir si marcar como failed permanente
      const { data: deliveryState } = await supabase
        .from('email_deliveries')
        .select('attempts')
        .eq('id', active_delivery_id)
        .single();

      const currentAttempts = (deliveryState?.attempts ?? 0) + 1;
      const MAX_RETRIES = 3; // igual que el retries configurado en QStash

      await supabase.from('email_deliveries').update({
        last_error: error.message,
        attempts:   currentAttempts,
        // Marcar como failed después del último reintento para no dejar en limbo
        ...(currentAttempts >= MAX_RETRIES ? { status: 'failed' } : {}),
      }).eq('id', active_delivery_id);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY,
});
