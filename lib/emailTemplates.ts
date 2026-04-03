/**
 * emailTemplates.ts
 * ---------------------------------------------------------------------------
 * Generador de plantillas HTML profesionales para correos de certificados.
 * Usa tabla-based layout para máxima compatibilidad con clientes de correo.
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
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;
  mostrar_footer?: boolean;
}

export interface CertificateEmailData {
  /** Nombre completo del destinatario */
  nombre_completo: string;
  /** Nombre del evento */
  nombre_evento: string;
  /** Fecha del evento (ya formateada) */
  fecha_evento?: string;
  /** URL pública del PDF del certificado (también se usa en el botón de descarga) */
  pdf_url: string;
  /** Código legible del certificado */
  codigo_certificado: string;
  /** URL de verificación del certificado */
  verificacion_url?: string;
  /**
   * HTML personalizado del cuerpo del mensaje (ya con placeholders resueltos).
   * Si se provee, reemplaza el párrafo estático de "Con mucho gusto...".
   * Si no se provee, se usa el texto por defecto.
   */
  cuerpo_html?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONOS SVG PARA REDES SOCIALES (inline, compatibles con email)
// ─────────────────────────────────────────────────────────────────────────────
const SOCIAL_ICONS: Record<string, string> = {
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  // Instagram: solid color fallback (#E1306C) — Gmail strips SVG <defs> so gradients don't work
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#E1306C"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#000000"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#000000"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a8.776 8.776 0 0 1-1.87-1.42v7.74c.04 4.14-2.88 8.04-6.99 8.91-4.11.87-8.49-1.39-9.84-5.32-1.39-3.91.43-8.52 4.19-10.34 1.16-.57 2.45-.83 3.73-.81v3.91c-.81-.07-1.63.05-2.38.38-.93.41-1.67 1.2-1.99 2.16-.39.98-.24 2.16.42 2.94.61.76 1.61 1.15 2.58 1.01.99-.11 1.84-.81 2.13-1.74.12-.42.15-.86.15-1.3v-11.4c-.01-1.05.01-2.11-.01-3.16Z"/></svg>`,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: icono social como link
// ─────────────────────────────────────────────────────────────────────────────
function socialLink(url: string | null | undefined, network: keyof typeof SOCIAL_ICONS): string {
  if (!url) return '';
  return `
    <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:0 6px;text-decoration:none;">
      ${SOCIAL_ICONS[network]}
    </a>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDAD: reemplazo de placeholders {{clave}} en una cadena de texto / HTML
// Soporta: {{nombre_completo}}, {{nombre_participante}}, {{evento_titulo}},
//          {{codigo_certificado}}, {{url_descarga}}, {{url_verificacion}}, etc.
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
// ─────────────────────────────────────────────────────────────────────────────
export function buildCertificateEmail(
  data: CertificateEmailData,
  config: EmailSistemaConfig,
  branding: TenantBranding,
): string {
  const logoUrl     = config.logo_url || branding.logo_url || '';
  const orgName     = config.nombre_remitente || branding.name || 'Nuestra Organización';
  const mostrarFooter = config.mostrar_footer !== false;

  // ── Redes sociales ──────────────────────────────────────────────────────
  const redesHtml = [
    socialLink(config.facebook_url, 'facebook'),
    socialLink(config.instagram_url, 'instagram'),
    socialLink(config.linkedin_url, 'linkedin'),
    socialLink(config.x_url, 'x'),
    socialLink(config.tiktok_url, 'tiktok'),
  ].join('');

  // ── Footer de contacto ─────────────────────────────────────────────────
  const footerContacto = [
    config.direccion_contacto ? `<span>${config.direccion_contacto}</span>` : '',
    config.telefono_contacto  ? `<span>Tel: ${config.telefono_contacto}</span>` : '',
    config.email_contacto     ? `<a href="mailto:${config.email_contacto}" style="color:#6B7280;text-decoration:none;">${config.email_contacto}</a>` : '',
    config.sitio_web          ? `<a href="${config.sitio_web}" style="color:#6B7280;text-decoration:none;" target="_blank">${config.sitio_web}</a>` : '',
  ].filter(Boolean).join('<span style="margin:0 6px;color:#D1D5DB;">·</span>');

  // ── Firma personalizada ────────────────────────────────────────────────
  const firmaBlock = config.firma_html
    ? `<div style="margin:24px 0 0;padding-top:20px;border-top:1px solid #E5E7EB;color:#374151;font-size:14px;line-height:1.6;">${config.firma_html}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Tu Certificado – ${data.nombre_evento}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Wrapper principal -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 16px 40px;">

        <!-- Tarjeta del correo -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
               style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- ═══ ENCABEZADO con gradiente ═══ -->
          <tr>
            <td style="background-color:#2563EB;background:linear-gradient(135deg,#1E3A5F 0%,#2563EB 60%,#3B82F6 100%);padding:36px 40px;text-align:center;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="${orgName}" height="52" style="max-height:52px;max-width:220px;object-fit:contain;display:inline-block;margin-bottom:16px;" /><br/>`
                : `<div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;margin-bottom:12px;">${orgName}</div>`}
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50px;padding:6px 18px;margin-bottom:8px;">
                <span style="color:rgba(255,255,255,0.9);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Certificado de Participación</span>
              </div>
            </td>
          </tr>

          <!-- ═══ SALUDO Y MENSAJE PRINCIPAL ═══ -->
          <tr>
            <td style="padding:40px 48px 28px;">
              <!-- Saludo -->
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366F1;letter-spacing:1px;text-transform:uppercase;">
                ¡Felicitaciones!
              </p>
              <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0F172A;line-height:1.25;letter-spacing:-0.5px;">
                ${escapeHtml(data.nombre_completo)}
              </h1>

              <!-- Mensaje: personalizado desde evento/plantilla o texto por defecto -->
              ${data.cuerpo_html
                ? `<div style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">${data.cuerpo_html}</div>`
                : `<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                     Con mucho gusto te informamos que has completado exitosamente tu participación en:
                   </p>`}

              <!-- Evento destacado -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#EFF6FF,#EDE9FE);border-left:4px solid #2563EB;border-radius:0 12px 12px 0;padding:18px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6366F1;letter-spacing:1px;text-transform:uppercase;">Evento Certificado</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#1E3A5F;line-height:1.4;">${escapeHtml(data.nombre_evento)}</p>
                    ${data.fecha_evento ? `<p style="margin:6px 0 0;font-size:13px;color:#6B7280;font-weight:500;">${escapeHtml(data.fecha_evento)}</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ SEPARADOR ═══ -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" />
            </td>
          </tr>

          <!-- ═══ CÓDIGO DEL CERTIFICADO ═══ -->
          <tr>
            <td style="padding:28px 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94A3B8;letter-spacing:1.5px;text-transform:uppercase;">Código de Certificado</p>
                    <p style="margin:0;font-size:18px;font-weight:800;color:#1E3A5F;letter-spacing:2px;font-family:monospace;">
                      ${escapeHtml(data.codigo_certificado)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ BOTONES DE ACCIÓN ═══ -->
          <tr>
            <td style="padding:0 48px 36px;text-align:center;">
              <!-- Botón principal: Descargar certificado -->
              <a href="${data.pdf_url}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:12px;margin-bottom:12px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.35);">
                ⬇&nbsp;&nbsp;Descargar mi Certificado
              </a>

              ${data.verificacion_url
                ? `<br/><a href="${data.verificacion_url}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;color:#2563EB;font-size:13px;font-weight:600;text-decoration:none;padding:8px 16px;border:1.5px solid #BFDBFE;border-radius:8px;margin-top:4px;">
                    Verificar autenticidad del certificado
                  </a>`
                : ''}
            </td>
          </tr>

          ${firmaBlock
            ? `<tr><td style="padding:0 48px 32px;">${firmaBlock}</td></tr>`
            : ''}

          <!-- ═══ FOOTER ═══ -->
          ${mostrarFooter ? `
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E5E7EB;padding:28px 48px;text-align:center;">
              <!-- Redes sociales -->
              ${redesHtml ? `<div style="margin-bottom:16px;">${redesHtml}</div>` : ''}

              <!-- Footer HTML personalizado o info de contacto -->
              ${config.footer_html
                ? `<div style="color:#6B7280;font-size:13px;line-height:1.6;margin-bottom:12px;">${config.footer_html}</div>`
                : footerContacto
                  ? `<p style="margin:0 0 12px;font-size:12px;color:#6B7280;line-height:1.8;">${footerContacto}</p>`
                  : ''}

              <!-- Nombre de organización -->
              <p style="margin:0;font-size:12px;color:#9CA3AF;font-weight:500;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(orgName)} · Todos los derechos reservados
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;">
                Este correo fue generado automáticamente. Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
          ` : ''}

        </table>
        <!-- Fin tarjeta -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLA: verificación de correo durante el proceso de inscripción
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

  const redesHtml = [
    socialLink(config.facebook_url, 'facebook'),
    socialLink(config.instagram_url, 'instagram'),
    socialLink(config.linkedin_url, 'linkedin'),
    socialLink(config.x_url, 'x'),
    socialLink(config.tiktok_url, 'tiktok'),
  ].join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirma tu inscripción – ${data.nombre_evento}</title>
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
                ? `<img src="${logoUrl}" alt="${orgName}" height="48" style="max-height:48px;display:inline-block;margin-bottom:16px;" /><br/>`
                : `<div style="font-size:20px;font-weight:800;color:white;margin-bottom:12px;">${orgName}</div>`}
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50px;padding:6px 18px;">
                <span style="color:rgba(255,255,255,0.95);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Confirma tu inscripción</span>
              </div>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:40px 48px 32px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#059669;letter-spacing:1px;text-transform:uppercase;">¡Hola!</p>
              <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0F172A;line-height:1.25;">
                ${escapeHtml(data.nombre)}
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
                Gracias por tu interés en:
              </p>
              <div style="background:#ECFDF5;border-left:4px solid #10B981;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#065F46;">${escapeHtml(data.nombre_evento)}</p>
              </div>
              <p style="margin:0 0 28px;font-size:14px;color:#4B5563;line-height:1.7;">
                Para completar tu inscripción, haz clic en el botón de abajo y verifica tu correo electrónico.
                Este enlace expira en <strong>${expira} minutos</strong>.
              </p>
              <div style="text-align:center;">
                <a href="${data.verificacion_url}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;background:linear-gradient(135deg,#059669,#047857);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 4px 14px rgba(5,150,105,0.35);">
                  ✉&nbsp;&nbsp;Verificar mi Correo
                </a>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
                Si no realizaste esta inscripción, puedes ignorar este correo.<br/>
                El enlace dejará de funcionar automáticamente.
              </p>
            </td>
          </tr>

          ${mostrarFooter ? `
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E5E7EB;padding:24px 48px;text-align:center;">
              ${redesHtml ? `<div style="margin-bottom:12px;">${redesHtml}</div>` : ''}
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
// HELPER: escape HTML básico para valores dinámicos en el template
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(str: string | null | undefined): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
