/**
 * emailTemplates.ts
 * ---------------------------------------------------------------------------
 * Layout fijo único para todos los correos de certificados.
 * Solo varían: asunto, cuerpo (mensaje_renderizado), visibilidad de secciones
 * y colores del header, según la configuración del tenant.
 * ---------------------------------------------------------------------------
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantBranding {
  name: string;
  logo_url?: string | null;
}

export interface EmailSistemaConfig {
  // Identidad
  nombre_remitente?: string | null;
  email_respuesta?: string | null;
  logo_url?: string | null;
  firma_html?: string | null;
  footer_html?: string | null;

  // Contacto
  telefono_contacto?: string | null;
  email_contacto?: string | null;
  direccion_contacto?: string | null;
  sitio_web?: string | null;
  /** Número de WhatsApp (ej: +573118121136). El enlace wa.me se construye automáticamente. */
  whatsapp_numero?: string | null;

  // Redes sociales
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;

  // ── Colores configurables ─────────────────────────────────────────────────
  /** Color principal del header. Ej: '#27498b'. Si se omite → azul institucional. */
  header_bg_color?: string | null;
  /** Color secundario para gradiente. Si se omite → se usa solo header_bg_color. */
  header_bg_secondary?: string | null;
  /** Color del texto/iconos del header. Default: '#ffffff'. */
  header_text_color?: string | null;
  /** Color de fondo del footer legal. Default: '#1e2847'. */
  footer_bg_color?: string | null;

  // ── Toggles de secciones ─────────────────────────────────────────────────
  /** Badge "Certificado de Participación" en el header. Default: true. */
  mostrar_titulo_certificado?: boolean | null;
  /** "¡Felicitaciones!" + nombre del participante en grande. Default: true. */
  mostrar_saludo_destacado?: boolean | null;
  /** Bloque "Evento Certificado" con título y fecha. Default: true. */
  mostrar_resumen_evento?: boolean | null;
  /** Bloque con el código del certificado. Default: true. */
  mostrar_codigo_certificado?: boolean | null;
  /** Botón "Descargar mi Certificado". Default: true. */
  mostrar_boton_descarga?: boolean | null;
  /** Botón "Verificar autenticidad". Default: true. */
  mostrar_boton_verificacion?: boolean | null;
  /** Bloque de firma/contacto institucional en texto. Default: true. */
  mostrar_bloque_contacto?: boolean | null;
  /** Fila de iconos de redes sociales. Default: true si hay datos, false si no. */
  mostrar_bloque_redes?: boolean | null;
  /** Footer legal oscuro al final. Default: true. */
  mostrar_footer?: boolean;
}

export interface CertificateEmailData {
  /** Nombre completo del destinatario */
  nombre_completo: string;
  /** Nombre del evento */
  nombre_evento: string;
  /** Fecha ya formateada */
  fecha_evento?: string;
  /** URL pública del PDF */
  pdf_url: string;
  /** Código del certificado */
  codigo_certificado: string;
  /** URL de verificación */
  verificacion_url?: string;
  /**
   * HTML del cuerpo con placeholders ya resueltos.
   * Si no se provee se usa el texto por defecto.
   */
  cuerpo_html?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE PLANTILLAS — parser recursivo correcto para bloques anidados
//
// Problema del enfoque regex: [\s\S]*? (no-greedy) siempre machea el primer
// {{/if}} que encuentra. En bloques anidados ese es el {{/if}} del bloque
// INTERIOR, dejando el {{/if}} del exterior huérfano y visible en el HTML.
//
// Solución: parser de descenso recursivo que lleva conteo de profundidad
// (depth) y localiza el {{/if}} correspondiente con precisión.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evalúa todos los bloques {{#if var}}...{{/if}} y {{#if var}}...{{else}}...{{/if}}
 * en `text`, con soporte correcto para anidamiento ilimitado.
 * Llama a sí misma recursivamente sobre el contenido seleccionado.
 */
function processBlock(text: string, vars: Record<string, string>): string {
  let output = '';
  let pos = 0;

  while (pos < text.length) {
    // Buscar el próximo {{#if
    const ifStart = text.indexOf('{{#if ', pos);
    if (ifStart === -1) {
      output += text.slice(pos);
      break;
    }

    // Texto antes de este bloque — pasar tal cual
    output += text.slice(pos, ifStart);

    // Leer el tag {{#if varname}}
    const tagEnd = text.indexOf('}}', ifStart + 6);
    if (tagEnd === -1) { output += text.slice(ifStart); break; }

    const varName   = text.slice(ifStart + 6, tagEnd).trim();
    const bodyStart = tagEnd + 2;  // primer caracter del cuerpo del bloque
    let   depth     = 1;           // profundidad de anidamiento
    let   elseAt    = -1;          // posición de {{else}} a depth=1
    let   closeAt   = -1;          // posición del {{/if}} que cierra este bloque
    let   cur       = bodyStart;

    // Recorrer hasta encontrar el {{/if}} que corresponde a este {{#if}}
    while (cur < text.length) {
      const nOpen  = text.indexOf('{{#if ',   cur);
      const nClose = text.indexOf('{{/if}}',  cur);
      const nElse  = text.indexOf('{{else}}', cur);

      if (nClose === -1) break; // bloque sin cerrar — salir

      // ¿Cuál token aparece primero?
      let first = nClose;
      if (nOpen !== -1 && nOpen < first) first = nOpen;
      if (nElse !== -1 && nElse < first) first = nElse;

      if (first === nOpen) {
        // Abre un bloque anidado — incrementar profundidad
        depth++;
        cur = nOpen + 6;
      } else if (first === nElse) {
        // {{else}} — solo es nuestro si estamos a depth 1
        if (depth === 1) elseAt = nElse;
        cur = nElse + 8; // 8 = '{{else}}'.length
      } else {
        // {{/if}} — decrementar profundidad
        depth--;
        if (depth === 0) { closeAt = nClose; break; } // encontramos el cierre correcto
        cur = nClose + 7; // 7 = '{{/if}}'.length
      }
    }

    if (closeAt === -1) {
      // Bloque sin cerrar — incluir el texto original sin procesar
      output += text.slice(ifStart);
      break;
    }

    // Evaluar la condición
    const truthy = (vars[varName] ?? '').length > 0;

    if (truthy) {
      const thenContent = elseAt !== -1
        ? text.slice(bodyStart, elseAt)
        : text.slice(bodyStart, closeAt);
      output += processBlock(thenContent, vars); // recursivo
    } else if (elseAt !== -1) {
      const elseContent = text.slice(elseAt + 8, closeAt); // +8 = '{{else}}'.length
      output += processBlock(elseContent, vars); // recursivo
    }
    // Si falsy y sin else → no emitir nada

    pos = closeAt + 7; // avanzar después del {{/if}}
  }

  return output;
}

/**
 * Procesa una plantilla completa:
 * 1. Evalúa todos los bloques {{#if}}...{{/if}} (con anidamiento correcto)
 * 2. Sustituye todos los {{placeholder}} simples restantes
 */
export function processTemplate(template: string, vars: Record<string, string>): string {
  const withBlocks = processBlock(template, vars);
  return withBlocks.replace(/\{\{(\w+)\}\}/g, (_m, key) => vars[key] ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT BASE FIJO
// Cada sección está envuelta en {{#if show_X}} para poder desactivarla.
// El header usa {{header_bg}} para color configurable.
// El footer queda DENTRO del card para integrarse visualmente.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_EMAIL_TEMPLATE = `<div style="margin:0; padding:30px 15px; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:760px; margin:0 auto; background-color:#ffffff; border-radius:18px; overflow:hidden; color:#1f2a44; box-shadow:0 10px 30px rgba(0,0,0,0.06);">

    <!-- ═══ HEADER ═══ -->
    <div style="background:{{header_bg}}; padding:32px 30px 26px 30px; text-align:center;">

      {{#if logo_url}}
      <div style="margin-bottom:18px;">
        <img src="{{logo_url}}" alt="Logo institucional"
          style="max-width:260px; width:100%; height:auto; display:block; margin:0 auto;" />
      </div>
      {{/if}}

    </div>

    <!-- ═══ BODY ═══ -->
    <div style="padding:42px 46px 36px 46px;">

      <!-- MENSAJE PRINCIPAL — protagonista del correo -->
      <div style="font-size:16px; line-height:1.8; color:#38445c;">
        {{mensaje_renderizado}}
      </div>

      {{#if show_boton_descarga}}
      <div style="margin-top:32px; text-align:center;">
        <a href="{{url_descarga}}" target="_blank"
          style="display:inline-block; background:linear-gradient(90deg,{{header_bg_btn_start}} 0%,{{header_bg_btn_end}} 100%); color:#ffffff; text-decoration:none; font-size:17px; font-weight:800; padding:16px 32px; border-radius:14px; min-width:300px; box-shadow:0 6px 16px rgba(53,88,216,0.22);">
          &#11015; Descargar mi Certificado
        </a>
      </div>
      {{/if}}

      {{#if show_bloque_contacto}}
      <!-- FIRMA / CONTACTO -->
      <div style="margin-top:36px; padding-top:28px; border-top:1px solid #e7ebf2; font-size:14px; line-height:1.7; color:#4b5563;">
        {{#if firma_html}}
          {{firma_html}}
        {{else}}
          <p style="margin:0 0 6px 0; font-size:15px; font-weight:800; color:#374151;">{{org_name}}</p>
          {{#if direccion_contacto}}
          <p style="margin:0 0 4px 0; color:#6b7280;">{{direccion_contacto}}</p>
          {{/if}}
          {{#if telefono_contacto}}
          <p style="margin:0 0 4px 0; color:#6b7280;">Tel: {{telefono_contacto}}</p>
          {{/if}}
          {{#if email_contacto}}
          <p style="margin:0 0 4px 0;">
            <a href="mailto:{{email_contacto}}" style="color:#2563eb; text-decoration:none;">{{email_contacto}}</a>
          </p>
          {{/if}}
          {{#if sitio_web}}
          <p style="margin:0 0 4px 0;">
            <a href="{{sitio_web}}" style="color:#2563eb; text-decoration:none;" target="_blank">{{sitio_web}}</a>
          </p>
          {{/if}}
        {{/if}}
      </div>
      {{/if}}

    </div>

    <!-- ═══ REDES / CONTACTO VISUAL ═══ -->
    {{#if show_bloque_redes}}
    <div style="padding:16px 40px 24px 40px; text-align:center; border-top:1px solid #eef0f5;">

      <div style="text-align:center; margin-bottom:10px;">
        {{#if whatsapp_url}}
        <a href="{{whatsapp_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/1384/1384023.png" alt="WhatsApp" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if email_contacto}}
        <a href="mailto:{{email_contacto}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="Correo" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if sitio_web}}
        <a href="{{sitio_web}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Sitio web" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if facebook_url}}
        <a href="{{facebook_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/20/20837.png" alt="Facebook" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if instagram_url}}
        <a href="{{instagram_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/87/87390.png" alt="Instagram" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if linkedin_url}}
        <a href="{{linkedin_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/61/61109.png" alt="LinkedIn" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if x_url}}
        <a href="{{x_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/5968/5968830.png" alt="X" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
        {{#if tiktok_url}}
        <a href="{{tiktok_url}}" target="_blank" style="display:inline-block; margin:6px 10px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" width="26" height="26" style="display:block; width:26px; height:26px; border:0;" />
        </a>
        {{/if}}
      </div>

      {{#if direccion_contacto}}
      <div style="font-size:12px; color:#8b93a7; line-height:1.5;">{{direccion_contacto}}</div>
      {{/if}}

    </div>
    {{/if}}

    <!-- ═══ FOOTER LEGAL — dentro del card, bordes inferiores redondeados ═══ -->
    {{#if show_footer_legal}}
    <div style="background:{{footer_bg}}; color:#c8d0e0; padding:20px 32px; font-size:10.5px; line-height:1.7; text-align:justify; border-radius:0 0 18px 18px;">
      <p style="margin:0 0 8px 0;">
        Este es un correo generado autom&#225;ticamente por el sistema de <strong style="color:#e0e5f0;">{{org_name}}</strong>.
        Por favor no responda a este mensaje, ya que este buz&#243;n no est&#225; habilitado para recibir respuestas.
        Si requiere informaci&#243;n adicional, comun&#237;quese a trav&#233;s de nuestros canales oficiales.
      </p>
      <p style="margin:0; color:#8b95b0;">
        <strong>Aviso de confidencialidad:</strong> Este mensaje puede contener informaci&#243;n confidencial destinada exclusivamente al destinatario.
        Si recibi&#243; este correo por error, por favor elim&#237;nelo e informe al remitente.
      </p>
    </div>
    {{/if}}

  </div>
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD: reemplazo de placeholders {{clave}} en asunto / cuerpo personalizado
// ─────────────────────────────────────────────────────────────────────────────
export function resolvePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replaceAll(key, val ?? ''),
    template,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: convierte un flag booleano a 'true' o '' para el motor de plantillas
// ─────────────────────────────────────────────────────────────────────────────
function on(v: boolean | null | undefined, def: boolean): string {
  return (v ?? def) ? 'true' : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA PRINCIPAL: correo de certificado
// Layout fijo — solo cambian contenido, visibilidad de secciones y colores.
// ─────────────────────────────────────────────────────────────────────────────
export function buildCertificateEmail(
  data: CertificateEmailData,
  config: EmailSistemaConfig,
  branding: TenantBranding,
): string {
  const logoUrl = config.logo_url || branding.logo_url || '';
  const orgName = config.nombre_remitente || branding.name || 'Nuestra Organización';

  // ── Header colors ──────────────────────────────────────────────────────────
  const bgStart = config.header_bg_color ?? '#27498b';
  const bgEnd   = config.header_bg_secondary ?? '#3f67d8';
  const headerBg = config.header_bg_color
    ? config.header_bg_secondary
      ? `linear-gradient(90deg,${bgStart} 0%,${bgEnd} 100%)`
      : bgStart
    : `linear-gradient(90deg,#27498b 0%,#3f67d8 100%)`;
  const headerTextColor = config.header_text_color || '#ffffff';

  // ── WhatsApp URL ───────────────────────────────────────────────────────────
  const whatsappUrl = config.whatsapp_numero
    ? `https://wa.me/${config.whatsapp_numero.replace(/[^\d]/g, '')}`
    : '';

  // ── Visibilidad del bloque de redes ────────────────────────────────────────
  const hayRedes = !!(
    whatsappUrl            ||
    config.email_contacto  ||
    config.sitio_web       ||
    config.facebook_url    ||
    config.instagram_url   ||
    config.linkedin_url    ||
    config.x_url           ||
    config.tiktok_url      ||
    config.direccion_contacto
  );

  // ── Cuerpo del mensaje ─────────────────────────────────────────────────────
  const mensajeRenderizado = data.cuerpo_html?.trim() ||
    'Con mucho gusto te informamos que has completado exitosamente tu participaci&#243;n en el evento indicado. Tu certificado est&#225; disponible para descarga.';

  // ── Mapa de variables para el motor de plantillas ─────────────────────────
  const vars: Record<string, string> = {
    // Header
    header_bg:            headerBg,
    header_text_color:    headerTextColor,
    header_bg_btn_start:  bgStart,
    header_bg_btn_end:    bgEnd,
    footer_bg:            config.footer_bg_color || '#1e2847',

    // Toggles de secciones
    show_titulo_cert:        on(config.mostrar_titulo_certificado, true),
    show_saludo:             on(config.mostrar_saludo_destacado,   true),
    show_resumen_evento:     on(config.mostrar_resumen_evento,     true),
    show_codigo:             on(config.mostrar_codigo_certificado, true),
    show_boton_descarga:     on(config.mostrar_boton_descarga,     true),
    show_boton_verificacion: on(config.mostrar_boton_verificacion, true),
    show_bloque_contacto:    on(config.mostrar_bloque_contacto,    true),
    show_bloque_redes:       on(config.mostrar_bloque_redes,       hayRedes),
    show_footer_legal:       on(config.mostrar_footer,             true),

    // Logo
    logo_url: logoUrl,

    // Participante
    nombre_participante: escapeHtml(data.nombre_completo),

    // Cuerpo dinámico
    mensaje_renderizado: mensajeRenderizado,

    // Evento
    evento_titulo: escapeHtml(data.nombre_evento),
    fecha_evento:  escapeHtml(data.fecha_evento ?? ''),

    // Certificado
    codigo_certificado: escapeHtml(data.codigo_certificado),
    url_descarga:       data.pdf_url          || '#',
    url_verificacion:   data.verificacion_url || '#',

    // Firma / contacto (texto)
    firma_html:         config.firma_html          || '',
    org_name:           escapeHtml(orgName),
    direccion_contacto: config.direccion_contacto  || '',
    telefono_contacto:  config.telefono_contacto   || '',
    sitio_web:          config.sitio_web            || '',
    email_contacto:     config.email_contacto       || '',

    // Redes sociales
    whatsapp_url:  whatsappUrl,
    facebook_url:  config.facebook_url  || '',
    instagram_url: config.instagram_url || '',
    linkedin_url:  config.linkedin_url  || '',
    x_url:         config.x_url         || '',
    tiktok_url:    config.tiktok_url    || '',
  };

  const bodyHtml = processTemplate(BASE_EMAIL_TEMPLATE, vars);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Tu Certificado &#8211; ${escapeHtml(data.nombre_evento)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8;">
${bodyHtml}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA: verificación de correo (layout propio, no usa BASE_EMAIL_TEMPLATE)
// ─────────────────────────────────────────────────────────────────────────────
export function buildVerificationEmail(data: {
  nombre: string;
  nombre_evento: string;
  verificacion_url: string;
  expira_minutos?: number;
}, config: EmailSistemaConfig, branding: TenantBranding): string {
  const logoUrl = config.logo_url || branding.logo_url || '';
  const orgName = config.nombre_remitente || branding.name || 'Nuestra Organización';
  const expira  = data.expira_minutos ?? 60;
  const mostrarFooter = config.mostrar_footer !== false;

  const socialLinks = [
    config.facebook_url  ? `<a href="${config.facebook_url}"  target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 6px;text-decoration:none;color:#6B7280;font-size:12px;">Facebook</a>`  : '',
    config.instagram_url ? `<a href="${config.instagram_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 6px;text-decoration:none;color:#6B7280;font-size:12px;">Instagram</a>` : '',
    config.linkedin_url  ? `<a href="${config.linkedin_url}"  target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 6px;text-decoration:none;color:#6B7280;font-size:12px;">LinkedIn</a>`  : '',
    config.x_url         ? `<a href="${config.x_url}"         target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 6px;text-decoration:none;color:#6B7280;font-size:12px;">X</a>`         : '',
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirma tu inscripci&#243;n &#8211; ${escapeHtml(data.nombre_evento)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#10B981 60%,#34D399 100%);padding:36px 40px;text-align:center;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="${escapeHtml(orgName)}" height="48" style="max-height:48px;display:inline-block;margin-bottom:16px;" /><br/>`
                : `<div style="font-size:20px;font-weight:800;color:white;margin-bottom:12px;">${escapeHtml(orgName)}</div>`}
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;">
                <span style="color:rgba(255,255,255,0.95);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Confirma tu inscripci&#243;n</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 48px 32px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#059669;letter-spacing:1px;text-transform:uppercase;">&#161;Hola!</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0F172A;line-height:1.25;">${escapeHtml(data.nombre)}</h1>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Gracias por tu inter&#233;s en:</p>
              <div style="background:#ECFDF5;border-left:4px solid #10B981;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#065F46;">${escapeHtml(data.nombre_evento)}</p>
              </div>
              <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.7;">
                Para completar tu inscripci&#243;n, haz clic en el bot&#243;n de abajo y verifica tu correo electr&#243;nico.
                Este enlace expira en <strong>${expira} minutos</strong>.
              </p>
              <div style="text-align:center;">
                <a href="${data.verificacion_url}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(5,150,105,0.35);">
                  &#9993;&#160;&#160;Verificar mi Correo
                </a>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
                Si no realizaste esta inscripci&#243;n, puedes ignorar este correo.<br/>
                El enlace dejar&#225; de funcionar autom&#225;ticamente.
              </p>
            </td>
          </tr>

          ${mostrarFooter ? `
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E5E7EB;padding:24px 48px;text-align:center;">
              ${socialLinks ? `<div style="margin-bottom:12px;">${socialLinks}</div>` : ''}
              <p style="margin:0;font-size:12px;color:#9CA3AF;">&copy; ${new Date().getFullYear()} ${escapeHtml(orgName)}</p>
            </td>
          </tr>` : ''}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: escape HTML para valores dinámicos inyectados como texto plano
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(str: string | null | undefined): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
