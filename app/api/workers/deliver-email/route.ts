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
    const { data: delivery } = await supabase
      .from('email_deliveries')
      .select('email_to, retry_count, status')
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
    const { data: job } = await supabase
      .from('certificate_jobs')
      .select('pdf_url, evento_id, persona_id, codigo_certificado')
      .eq('id', job_id)
      .single();

    if (!job?.pdf_url) {
      // Sin PDF no se puede enviar — error permanente
      await supabase.from('email_deliveries').update({
        status:    'failed',
        error_log: 'PDF no encontrado en el job — generación pudo haber fallado.',
        retry_count: (delivery.retry_count ?? 0) + 1,
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
        status:    'failed',
        error_log: msg,
        retry_count: (delivery.retry_count ?? 0) + 1,
      }).eq('id', delivery_id);
      return NextResponse.json({ success: true, message: msg });
    }

    // 4. Datos de contexto para armar el correo
    const [tenantRes, configRes, eventoRes, personaRes] = await Promise.all([
      supabase.from('tenants').select('name, logo_url').eq('id', tenant_id).single(),
      supabase.from('configuracion_correo_sistema').select('*').eq('tenant_id', tenant_id).eq('activo', true).limit(1).single(),
      supabase.from('eventos').select('titulo, fecha_inicio, fecha_fin').eq('id', job.evento_id).single(),
      supabase.from('personas').select('nombre_completo, nombres, apellidos').eq('id', job.persona_id).single(),
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
      delivery.email_to;

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

    const emailData: CertificateEmailData = {
      nombre_completo:    nombreCompleto,
      nombre_evento:      evento?.titulo ?? 'Evento',
      fecha_evento:       fechaEvento,
      pdf_url:            job.pdf_url,
      codigo_certificado: job.codigo_certificado ?? job_id,
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
            status:    'failed',
            error_log: `PDF no encontrado en Storage (404). URL: ${job.pdf_url}`,
            retry_count: (delivery.retry_count ?? 0) + 1,
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
      to:          delivery.email_to,
      subject:     asunto,
      htmlBody,
      pdfBuffer,
      pdfFilename: `certificado_${(job.codigo_certificado ?? job_id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
    });

    // Gmail requiere base64url (sin padding =)
    const rawBase64url = Buffer.from(rawMime).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`[Worker Email] Enviando correo a ${delivery.email_to} desde <${senderEmail}> (asunto: "${asunto}")`);
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
          status:      'failed',
          error_log:   errMessage,
          retry_count: (delivery.retry_count ?? 0) + 1,
        }).eq('id', delivery_id);
        // Retornar 200 para que QStash NO reintente
        return NextResponse.json({ success: false, message: errMessage });
      }

      throw new Error(errMessage); // retriable → QStash reintentará
    }

    console.log(`[Worker Email] ✅ Correo enviado a ${delivery.email_to} — Job ${job_id}`);

    // 7. Marcar como enviado
    await supabase.from('email_deliveries').update({
      status:        'sent',
      dispatched_at: new Date().toISOString(),
      error_log:     null,
    }).eq('id', delivery_id);

    return NextResponse.json({ success: true, message: `Correo enviado a ${delivery.email_to}` });

  } catch (error: any) {
    console.error(`[Worker Email] Error retriable (${error.message}) — QStash reintentará.`);

    if (active_delivery_id) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get() { return ''; } } },
      );

      // Leer retry_count actual para decidir si marcar como failed
      const { data: deliveryState } = await supabase
        .from('email_deliveries')
        .select('retry_count')
        .eq('id', active_delivery_id)
        .single();

      const currentRetries = (deliveryState?.retry_count ?? 0) + 1;
      const MAX_RETRIES = 3; // igual que el retries configurado en QStash

      await supabase.from('email_deliveries').update({
        error_log:   error.message,
        retry_count: currentRetries,
        // Marcar como failed después del último reintento para no dejar en limbo
        ...(currentRetries >= MAX_RETRIES ? { status: 'failed' } : {}),
      }).eq('id', active_delivery_id);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler, {
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY,
});
