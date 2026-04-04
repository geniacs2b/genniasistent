import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { google } from "googleapis";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  buildCertificateEmail,
  resolvePlaceholders,
  type TenantBranding,
  type EmailSistemaConfig,
} from "@/lib/emailTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers MIME — sin adjuntos (PDF se entrega vía link en el cuerpo)
// ─────────────────────────────────────────────────────────────────────────────

/** Codifica un asunto con caracteres no ASCII para cabeceras de correo. */
function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
}

/** Construye un mensaje MIME simple text/html (sin adjunto PDF). */
function buildHtmlMessage(opts: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
}): string {
  const htmlBase64 = Buffer.from(opts.htmlBody, 'utf-8').toString('base64');

  const lines = [
    `MIME-Version: 1.0`,
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    // RFC 2822 exige líneas de máximo 76 caracteres en base64
    ...htmlBase64.match(/.{1,76}/g) ?? [],
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
    console.log(`[Worker Email] Recibido | job=${job_id} | delivery=${delivery_id}`);

    active_delivery_id = delivery_id;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return ''; } } },
    );

    // ── 1. Obtener delivery ──────────────────────────────────────────────────
    // Schema real: to_email, attempts, last_error, sent_at (NO email_to, retry_count, error_log)
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
      console.warn(`[Worker Email] Delivery ${delivery_id} ya marcado como failed permanente — no se reintenta.`);
      return NextResponse.json({ success: true, message: 'Error permanente registrado.' });
    }

    // ── 2. Obtener job ───────────────────────────────────────────────────────
    const { data: job } = await supabase
      .from('certificate_jobs')
      .select('pdf_url, evento_id, participante_id')
      .eq('id', job_id)
      .single();

    if (!job?.pdf_url) {
      await supabase.from('email_deliveries').update({
        status:     'failed',
        last_error: 'PDF no encontrado en el job — generación pudo haber fallado.',
        attempts:   (delivery.attempts ?? 0) + 1,
      }).eq('id', delivery_id);
      return NextResponse.json({ success: true, message: 'PDF no disponible — marcado como failed.' });
    }

    // ── 3. Credenciales OAuth del tenant ─────────────────────────────────────
    const { data: oauthConfig } = await supabase
      .from('email_configurations')
      .select('refresh_token, sender_email, is_active')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();

    if (!oauthConfig?.refresh_token) {
      const msg = 'El Tenant no tiene una cuenta de Google conectada o está inactiva.';
      await supabase.from('email_deliveries').update({
        status:     'failed',
        last_error: msg,
        attempts:   (delivery.attempts ?? 0) + 1,
      }).eq('id', delivery_id);
      return NextResponse.json({ success: true, message: msg });
    }

    // ── 4. Datos de contexto: tenant, config, evento, persona ────────────────
    // eventos: incluir asunto_correo, mensaje_correo_html, plantilla_correo_id para resolver cuerpo/asunto
    // personas: incluir todos los campos para resolver placeholders dinámicos
    const [tenantRes, configRes, eventoRes, personaRes] = await Promise.all([
      supabase.from('tenants').select('name, logo_url').eq('id', tenant_id).single(),
      supabase.from('configuracion_correo_sistema').select('*').eq('tenant_id', tenant_id).eq('activo', true).limit(1).single(),
      supabase.from('eventos')
        .select('titulo, fecha_inicio, fecha_fin, asunto_correo, mensaje_correo_html, plantilla_correo_id')
        .eq('id', job.evento_id)
        .single(),
      supabase.from('personas')
        .select('nombre_completo, nombres, apellidos, numero_documento, tipo_documento, correo, telefono, empresa, cargo, municipio, departamento')
        .eq('id', job.participante_id)
        .single(),
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

    const publicBase    = process.env.PUBLIC_BASE_URL || "https://genniasistent.vercel.app";
    const verificacionUrl = `${publicBase}/verificar?cert=${job_id}`;
    const codigoCert    = `CERT-${job_id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    // ── 5. Fechas formateadas ────────────────────────────────────────────────
    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
    };
    const fechaInicioEvento = evento?.fecha_inicio ? fmtDate(evento.fecha_inicio) : '';
    const fechaFinEvento    = evento?.fecha_fin    ? fmtDate(evento.fecha_fin)    : '';
    let fechaEvento: string | undefined;
    if (evento?.fecha_inicio) {
      fechaEvento = evento.fecha_fin && evento.fecha_fin !== evento.fecha_inicio
        ? `${fmtDate(evento.fecha_inicio)} al ${fmtDate(evento.fecha_fin)}`
        : fmtDate(evento.fecha_inicio);
    }

    // ── 7. Diccionario de placeholders ───────────────────────────────────────
    const placeholders: Record<string, string> = {
      // Participante
      '{{nombre_participante}}':       nombreCompleto,
      '{{nombre_completo}}':           nombreCompleto,
      '{{nombres}}':                   persona?.nombres   ?? '',
      '{{apellidos}}':                 persona?.apellidos ?? '',
      '{{numero_documento}}':          persona?.numero_documento  ?? '',
      '{{tipo_documento}}':            persona?.tipo_documento    ?? '',
      '{{correo_participante}}':       persona?.correo            ?? delivery.to_email,
      '{{telefono_participante}}':     (persona as any)?.telefono ?? '',
      '{{empresa_participante}}':      (persona as any)?.empresa  ?? '',
      '{{cargo_participante}}':        (persona as any)?.cargo    ?? '',
      '{{municipio_participante}}':    (persona as any)?.municipio    ?? '',
      '{{departamento_participante}}': (persona as any)?.departamento ?? '',

      // Evento
      '{{evento_titulo}}':             evento?.titulo ?? '',
      '{{nombre_evento}}':             evento?.titulo ?? '',
      '{{fecha_evento}}':              fechaEvento         ?? '',
      '{{fecha_inicio_evento}}':       fechaInicioEvento,
      '{{fecha_fin_evento}}':          fechaFinEvento,

      // Certificado
      '{{codigo_certificado}}':        codigoCert,
      '{{url_descarga}}':              job.pdf_url,
      '{{url_verificacion}}':          verificacionUrl,

      // Institucional (para uso en cuerpo personalizado)
      '{{logo_url}}':             sysConf?.logo_url            ?? '',
      '{{telefono_contacto}}':    sysConf?.telefono_contacto   ?? '',
      '{{email_contacto}}':       sysConf?.email_contacto      ?? '',
      '{{direccion_contacto}}':   sysConf?.direccion_contacto  ?? '',
      '{{sitio_web}}':            sysConf?.sitio_web            ?? '',
      '{{facebook_url}}':         sysConf?.facebook_url         ?? '',
      '{{instagram_url}}':        sysConf?.instagram_url        ?? '',
      '{{linkedin_url}}':         sysConf?.linkedin_url         ?? '',
      '{{x_url}}':                sysConf?.x_url                ?? '',
      '{{tiktok_url}}':           sysConf?.tiktok_url           ?? '',
    };

    // ── 7. Resolver plantilla de correo (si el evento tiene plantilla_correo_id) ──
    let plantillaAsunto: string | null = null;
    let plantillaCuerpo: string | null = null;

    if (evento?.plantilla_correo_id) {
      const { data: plantillaCorreo } = await supabase
        .from('plantillas_correo')
        .select('asunto, cuerpo_html')
        .eq('id', evento.plantilla_correo_id)
        .single();

      plantillaAsunto = plantillaCorreo?.asunto   ?? null;
      plantillaCuerpo = plantillaCorreo?.cuerpo_html ?? null;
      console.log(`[Worker Email] Plantilla correo cargada: id=${evento.plantilla_correo_id} | asunto=${!!plantillaAsunto} | cuerpo=${!!plantillaCuerpo}`);
    }

    // ── 8. Resolver asunto (prioridad: evento → plantilla → fallback) ─────────
    const asuntoRaw =
      (evento?.asunto_correo?.trim() || null) ??
      (plantillaAsunto?.trim()       || null) ??
      (evento?.titulo ? `Tu certificado de "${evento.titulo}" está listo` : 'Tu certificado de participación está listo');

    const asunto = resolvePlaceholders(asuntoRaw, placeholders);
    console.log(`[Worker Email] Asunto resuelto: "${asunto}"`);

    // ── 9. Resolver cuerpo HTML (prioridad: evento → plantilla → template por defecto) ──
    const cuerpoRaw =
      (evento?.mensaje_correo_html?.trim() || null) ??
      (plantillaCuerpo?.trim()             || null);

    const cuerpoHtml = cuerpoRaw
      ? resolvePlaceholders(cuerpoRaw, placeholders)
      : undefined;

    console.log(`[Worker Email] Cuerpo: ${cuerpoHtml ? `personalizado (${cuerpoHtml.length} chars)` : 'template por defecto'}`);

    // ── 10. Construir HTML del correo ────────────────────────────────────────
    const htmlBody = buildCertificateEmail(
      {
        nombre_completo:    nombreCompleto,
        nombre_evento:      evento?.titulo ?? 'Evento',
        fecha_evento:       fechaEvento,
        pdf_url:            job.pdf_url,
        codigo_certificado: codigoCert,
        verificacion_url:   verificacionUrl,
        cuerpo_html:        cuerpoHtml,          // undefined = usa texto por defecto
      },
      sysConf ?? {},
      branding,
    );

    // ── 11. Construir y enviar mensaje MIME via Gmail API ────────────────────
    // Sin adjunto PDF — el acceso al certificado es mediante links en el cuerpo.
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${publicBase}/api/oauth/google/callback`,
    );
    oauth2Client.setCredentials({ refresh_token: oauthConfig.refresh_token });

    const gmail       = google.gmail({ version: 'v1', auth: oauth2Client });
    const senderName  = sysConf?.nombre_remitente ?? branding.name;
    const senderEmail = oauthConfig.sender_email;

    const rawMime = buildHtmlMessage({
      from:     `"${senderName}" <${senderEmail}>`,
      to:       delivery.to_email,
      subject:  asunto,
      htmlBody,
    });

    // Gmail requiere base64url (sin padding =)
    const rawBase64url = Buffer.from(rawMime).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`[Worker Email] Enviando a ${delivery.to_email} desde <${senderEmail}> | asunto="${asunto}"`);
    try {
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawBase64url },
      });
    } catch (gmailErr: any) {
      const httpCode   = gmailErr?.response?.status ?? gmailErr?.code ?? 0;
      const gmailMsg   = gmailErr?.response?.data?.error ?? gmailErr?.message ?? String(gmailErr);
      const errMessage = `❌ Error Gmail API (HTTP ${httpCode}): ${gmailMsg}`;

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
        return NextResponse.json({ success: false, message: errMessage });
      }

      throw new Error(errMessage); // retriable → QStash reintentará
    }

    console.log(`[Worker Email] ✅ Correo enviado a ${delivery.to_email} — Job ${job_id}`);

    // ── 12. Marcar delivery como 'sent' ──────────────────────────────────────
    const { error: updateDeliveryError } = await supabase.from('email_deliveries').update({
      status:     'sent',
      sent_at:    new Date().toISOString(),
      last_error: null,
    }).eq('id', delivery_id);

    if (updateDeliveryError) {
      console.warn(`[Worker Email] Error actualizando email_deliveries a 'sent': ${updateDeliveryError.message}`);
    } else {
      console.log(`[Worker Email] email_deliveries ${delivery_id} → status='sent'`);
    }

    // ── 13. Actualizar certificate_jobs a 'sent' con email_sent=true ─────────
    const { error: jobSentError } = await supabase.from('certificate_jobs').update({
      status:     'sent',
      email_sent: true,
    }).eq('id', job_id);

    if (jobSentError) {
      console.warn(`[Worker Email] Error actualizando job ${job_id} a 'sent': ${jobSentError.message}`);
    } else {
      console.log(`[Worker Email] certificate_jobs ${job_id} → status='sent' email_sent=true`);
    }

    // ── 14. Sincronización con tabla legada (visibilidad en UI) ───────────────
    try {
      const { data: inscripcion } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('evento_id', job.evento_id)
        .eq('persona_id', job.participante_id)
        .maybeSingle();

      if (inscripcion) {
        await supabase.from('envios_correo').insert({
          evento_id:      job.evento_id,
          persona_id:     job.participante_id,
          inscripcion_id: inscripcion.id,
          estado:         'enviado',
          asunto_real:    asunto,
          sent_at:        new Date().toISOString(),
          proveedor_id:   'engine-v2',
          metadata: { job_id, delivery_id, engine: 'native_v2' },
        });
      }
    } catch (syncErr: any) {
      console.error(`[Worker Email] Error en sincronización legada (no crítico): ${syncErr.message}`);
    }

    // ── 15. Descontar cuota ──────────────────────────────────────────────────
    try {
      console.log(`[Worker Email] Descontando cuota (-1) para tenant: ${tenant_id}`);
      await supabase.rpc('decrement_tenant_quota', { p_tenant_id: tenant_id, amount: 1 });
    } catch (quotaErr: any) {
      console.error(`[Worker Email] Error descontando cuota: ${quotaErr.message}`);
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

      const { data: deliveryState } = await supabase
        .from('email_deliveries')
        .select('attempts')
        .eq('id', active_delivery_id)
        .single();

      const currentAttempts = (deliveryState?.attempts ?? 0) + 1;
      const MAX_RETRIES = 3;

      await supabase.from('email_deliveries').update({
        last_error: error.message,
        attempts:   currentAttempts,
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
