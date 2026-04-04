/**
 * emailTemplates.ts
 * ---------------------------------------------------------------------------
 * Layout fijo único para todos los correos de certificados.
 * El diseño visual NUNCA cambia — solo varían: asunto, cuerpo (mensaje_renderizado)
 * y la visibilidad de iconos/redes/contacto según los datos disponibles.
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
  nombre_remitente?: string | null;
  email_respuesta?: string | null;
  logo_url?: string | null;
  firma_html?: string | null;
  footer_html?: string | null;
  telefono_contacto?: string | null;
  email_contacto?: string | null;
  direccion_contacto?: string | null;
  sitio_web?: string | null;
  /** Número de WhatsApp (ej: +573118121136). Se construye el enlace wa.me automáticamente. */
  whatsapp_numero?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;
  mostrar_footer?: boolean;
}

export interface CertificateEmailData {
  /** Nombre completo del destinatario (se muestra como título prominente) */
  nombre_completo: string;
  /** Nombre del evento */
  nombre_evento: string;
  /** Fecha del evento ya formateada */
  fecha_evento?: string;
  /** URL pública del PDF del certificado */
  pdf_url: string;
  /** Código legible del certificado */
  codigo_certificado: string;
  /** URL de verificación del certificado */
  verificacion_url?: string;
  /**
   * HTML del cuerpo del mensaje ya con placeholders resueltos.
   * Si no se provee, se usa el texto por defecto.
   */
  cuerpo_html?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE PLANTILLAS
// Procesa bloques {{#if var}}...{{/if}} y {{#if var}}...{{else}}...{{/if}}
// Luego reemplaza {{placeholder}} simples.
// ─────────────────────────────────────────────────────────────────────────────

export function processTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  let prev = '';

  // Itera hasta que no haya más bloques {{#if}} sin resolver.
  // El regex no-greedy procesa siempre el bloque más interno primero.
  while (result !== prev) {
    prev = result;
    result = result.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, varName: string, content: string) => {
        const value  = vars[varName] ?? '';
        const truthy = value.length > 0;

        const elseIdx = content.indexOf('{{else}}');
        if (elseIdx !== -1) {
          return truthy
            ? content.slice(0, elseIdx)
            : content.slice(elseIdx + 8); // 8 === '{{else}}'.length
        }
        return truthy ? content : '';
      },
    );
  }

  // Reemplazar todos los {{placeholder}} restantes
  return result.replace(/\{\{(\w+)\}\}/g, (_m, key) => vars[key] ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT BASE FIJO — nunca cambia entre correos
// ─────────────────────────────────────────────────────────────────────────────

const BASE_EMAIL_TEMPLATE = `<div style="margin:0; padding:30px 15px; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:760px; margin:0 auto; background-color:#ffffff; border-radius:18px; overflow:hidden; color:#1f2a44; box-shadow:0 10px 30px rgba(0,0,0,0.06);">

    <!-- HEADER -->
    <div style="background:linear-gradient(90deg,#27498b 0%,#3f67d8 100%); padding:32px 30px 26px 30px; text-align:center;">
      {{#if logo_url}}
      <div style="margin-bottom:18px;">
        <img
          src="{{logo_url}}"
          alt="Logo institucional"
          style="max-width:260px; width:100%; height:auto; display:block; margin:0 auto;"
        />
      </div>
      {{/if}}

      <div style="display:inline-block; background:rgba(255,255,255,0.14); border-radius:999px; padding:14px 34px;">
        <span style="font-size:19px; font-weight:700; letter-spacing:1px; color:#ffffff; text-transform:uppercase;">
          Certificado de Participaci&#243;n
        </span>
      </div>
    </div>

    <!-- BODY -->
    <div style="padding:42px 46px 28px 46px;">

      <div style="margin-bottom:10px; color:#6366f1; font-size:19px; font-weight:700; letter-spacing:0.5px;">
        &#161;Felicitaciones!
      </div>

      <div style="margin-bottom:22px; color:#111833; font-size:31px; line-height:1.2; font-weight:800;">
        {{nombre_participante}}
      </div>

      <!-- MENSAJE DIN&#193;MICO -->
      <div style="font-size:18px; line-height:1.75; color:#38445c; text-align:justify;">
        {{mensaje_renderizado}}
      </div>

      <!-- RESUMEN EVENTO -->
      <div style="margin-top:28px; background:#f1f3ff; border-left:6px solid #4a6cf0; border-radius:0 18px 18px 0; padding:26px 28px;">
        <div style="font-size:15px; font-weight:800; letter-spacing:1px; color:#5c63e6; text-transform:uppercase; margin-bottom:10px;">
          Evento Certificado
        </div>
        <div style="font-size:21px; font-weight:800; color:#213a70; margin-bottom:8px;">
          {{evento_titulo}}
        </div>
        <div style="font-size:16px; color:#6b7280; line-height:1.5;">
          {{fecha_evento}}
        </div>
      </div>

      <!-- CODIGO -->
      <div style="margin-top:34px; border-top:1px solid #e7ebf2; padding-top:34px;">
        <div style="border:1px solid #dce3ef; border-radius:18px; padding:26px 20px; text-align:center; background:#fafbfd;">
          <div style="font-size:14px; font-weight:800; letter-spacing:2px; color:#95a1b8; text-transform:uppercase; margin-bottom:14px;">
            C&#243;digo de Certificado
          </div>
          <div style="font-size:22px; font-weight:800; letter-spacing:3px; color:#233768;">
            {{codigo_certificado}}
          </div>
        </div>
      </div>

      <!-- BOTONES -->
      <div style="margin-top:34px; text-align:center;">
        <a href="{{url_descarga}}" target="_blank"
          style="display:inline-block; background:linear-gradient(90deg,#3558d8 0%,#3b63ec 100%); color:#ffffff; text-decoration:none; font-size:18px; font-weight:800; padding:18px 34px; border-radius:18px; min-width:320px; box-shadow:0 8px 18px rgba(53,88,216,0.24);">
          &#11015; Descargar mi Certificado
        </a>
      </div>

      <div style="margin-top:16px; text-align:center;">
        <a href="{{url_verificacion}}" target="_blank"
          style="display:inline-block; background:#ffffff; color:#3a63ea; text-decoration:none; font-size:16px; font-weight:800; padding:16px 28px; border-radius:15px; min-width:280px; border:2px solid #b8ccff;">
          Verificar autenticidad del certificado
        </a>
      </div>

      <!-- FIRMA / CONTACTO BASE -->
      <div style="margin-top:42px; padding-top:30px; border-top:1px solid #e7ebf2; font-size:15px; line-height:1.7; color:#4b5563;">
        {{#if firma_html}}
          {{firma_html}}
        {{else}}
          <p style="margin:0 0 8px 0; font-size:16px; font-weight:800; color:#374151;">
            {{org_name}}
          </p>

          {{#if direccion_contacto}}
          <p style="margin:0 0 8px 0;">{{direccion_contacto}}</p>
          {{/if}}

          {{#if telefono_contacto}}
          <p style="margin:0 0 8px 0;">Tel: {{telefono_contacto}}</p>
          {{/if}}

          {{#if sitio_web}}
          <p style="margin:0 0 8px 0;">
            <a href="{{sitio_web}}" style="color:#2563eb; text-decoration:none;">{{sitio_web}}</a>
          </p>
          {{/if}}
        {{/if}}
      </div>
    </div>

    <!-- REDES / CONTACTO VISUAL -->
    {{#if mostrar_bloque_contacto_redes}}
    <div style="padding:18px 40px 28px 40px; text-align:center;">

      <div style="text-align:center; margin-bottom:12px;">

        {{#if whatsapp_url}}
        <a href="{{whatsapp_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/1384/1384023.png" alt="WhatsApp" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if email_contacto}}
        <a href="mailto:{{email_contacto}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="Correo" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if sitio_web}}
        <a href="{{sitio_web}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Sitio web" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if facebook_url}}
        <a href="{{facebook_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/20/20837.png" alt="Facebook" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if instagram_url}}
        <a href="{{instagram_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/87/87390.png" alt="Instagram" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if linkedin_url}}
        <a href="{{linkedin_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/61/61109.png" alt="LinkedIn" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if x_url}}
        <a href="{{x_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/5968/5968830.png" alt="X" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}

        {{#if tiktok_url}}
        <a href="{{tiktok_url}}" target="_blank" style="display:inline-block; margin:8px 12px; text-decoration:none;">
          <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" width="28" height="28" style="display:block; width:28px; height:28px; border:0;" />
        </a>
        {{/if}}
      </div>

      {{#if direccion_contacto}}
      <div style="margin-top:10px; font-size:14px; color:#5b6578; line-height:1.6;">
        {{direccion_contacto}}
      </div>
      {{/if}}
    </div>
    {{/if}}

    <!-- LEGAL -->
    {{#if mostrar_footer}}
    <div style="background:#202a56; color:#ffffff; padding:18px 28px; font-size:11px; line-height:1.65; text-align:justify;">
      Este es un correo generado autom&#225;ticamente por el sistema de {{org_name}}.
      Por favor, no responda a este mensaje, ya que este buz&#243;n no se encuentra habilitado para recibir respuestas.
      Si requiere informaci&#243;n adicional o atenci&#243;n personalizada, puede comunicarse a trav&#233;s de nuestros canales oficiales o escribir a nuestro correo institucional.
      <br><br>
      <strong>Aviso de confidencialidad:</strong> Este mensaje y sus anexos pueden contener informaci&#243;n confidencial o privilegiada destinada exclusivamente para el destinatario.
      Si usted no es el destinatario previsto, se proh&#237;be su uso, divulgaci&#243;n o copia. Si recibi&#243; este mensaje por error, por favor notif&#237;quelo al remitente y elim&#237;nelo inmediatamente de su sistema.
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
// PLANTILLA PRINCIPAL: correo de certificado
// Layout base fijo — solo cambian contenido y visibilidad de secciones.
// ─────────────────────────────────────────────────────────────────────────────
export function buildCertificateEmail(
  data: CertificateEmailData,
  config: EmailSistemaConfig,
  branding: TenantBranding,
): string {
  const logoUrl  = config.logo_url  || branding.logo_url || '';
  const orgName  = config.nombre_remitente || branding.name || 'Nuestra Organización';
  const mostrarFooter = config.mostrar_footer !== false;

  // Construir URL de WhatsApp desde el número (strips todo excepto dígitos y +)
  const whatsappUrl = config.whatsapp_numero
    ? `https://wa.me/${config.whatsapp_numero.replace(/[^\d]/g, '')}`
    : '';

  // El bloque de redes/contacto visual solo aparece si hay al menos un dato
  const mostrarBloqueRedes = !!(
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

  // Mensaje del cuerpo: personalizado desde evento/plantilla o texto por defecto
  const mensajeRenderizado = data.cuerpo_html?.trim() ||
    'Con mucho gusto te informamos que has completado exitosamente tu participación en el evento indicado. Tu certificado está disponible para descarga.';

  // Mapa de variables para el motor de plantillas
  const vars: Record<string, string> = {
    // Layout flags
    logo_url:                    logoUrl,
    mostrar_bloque_contacto_redes: mostrarBloqueRedes ? 'true' : '',
    mostrar_footer:              mostrarFooter ? 'true' : '',

    // Datos del participante
    nombre_participante: escapeHtml(data.nombre_completo),

    // Contenido dinámico
    mensaje_renderizado: mensajeRenderizado,

    // Evento
    evento_titulo: escapeHtml(data.nombre_evento),
    fecha_evento:  escapeHtml(data.fecha_evento ?? ''),

    // Certificado
    codigo_certificado: escapeHtml(data.codigo_certificado),
    url_descarga:       data.pdf_url          || '#',
    url_verificacion:   data.verificacion_url || '#',

    // Firma / contacto texto
    firma_html:          config.firma_html          || '',
    org_name:            escapeHtml(orgName),
    direccion_contacto:  config.direccion_contacto  || '',
    telefono_contacto:   config.telefono_contacto   || '',
    sitio_web:           config.sitio_web            || '',
    email_contacto:      config.email_contacto       || '',

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
// PLANTILLA: verificación de correo durante el proceso de inscripción
// (layout propio, no usa el BASE_EMAIL_TEMPLATE de certificados)
// ─────────────────────────────────────────────────────────────────────────────
export function buildVerificationEmail(data: {
  nombre: string;
  nombre_evento: string;
  verificacion_url: string;
  expira_minutos?: number;
}, config: EmailSistemaConfig, branding: TenantBranding): string {
  const logoUrl  = config.logo_url || branding.logo_url || '';
  const orgName  = config.nombre_remitente || branding.name || 'Nuestra Organización';
  const expira   = data.expira_minutos ?? 60;
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

          <!-- Encabezado -->
          <tr>
            <td style="background-color:#059669;background:linear-gradient(135deg,#059669 0%,#10B981 60%,#34D399 100%);padding:36px 40px;text-align:center;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="${escapeHtml(orgName)}" height="48" style="max-height:48px;display:inline-block;margin-bottom:16px;" /><br/>`
                : `<div style="font-size:20px;font-weight:800;color:white;margin-bottom:12px;">${escapeHtml(orgName)}</div>`}
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;">
                <span style="color:rgba(255,255,255,0.95);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Confirma tu inscripci&#243;n</span>
              </div>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:40px 48px 32px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#059669;letter-spacing:1px;text-transform:uppercase;">&#161;Hola!</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0F172A;line-height:1.25;">
                ${escapeHtml(data.nombre)}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                Gracias por tu inter&#233;s en:
              </p>
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
// HELPER: escape HTML básico para valores dinámicos inyectados como texto
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(str: string | null | undefined): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
