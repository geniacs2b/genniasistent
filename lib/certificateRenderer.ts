/**
 * certificateRenderer.ts
 * ---------------------------------------------------------------------------
 * Motor de renderizado de certificados.
 * Consulta la BD para obtener plantilla, campos y datos del participante,
 * construye un diccionario de variables y genera HTML listo para Puppeteer.
 * ---------------------------------------------------------------------------
 */

import QRCode from 'qrcode';
import { createServerClient } from '@supabase/ssr';

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO OFICIAL DE VARIABLES DINÁMICAS
// Cada tipo_campo del editor visual mapea a uno de estos identificadores.
// ─────────────────────────────────────────────────────────────────────────────
export const VARIABLE_TYPES = [
  'nombre_completo',      // Nombre y apellido completos (campo compuesto)
  'nombres',              // Solo nombres de pila
  'apellidos',            // Solo apellidos
  'numero_documento',     // Número de cédula / pasaporte / etc.
  'tipo_documento',       // CC, CE, PAS, TI…
  'nombre_evento',        // Nombre/título del evento (alias: "evento")
  'evento',               // Alias legacy de nombre_evento
  'fecha_emision',        // Fecha de hoy (emisión del certificado) — alias: "fecha"
  'fecha',                // Alias legacy de fecha_emision
  'fecha_inicio_evento',  // Fecha de inicio del evento formateada en español
  'fecha_fin_evento',     // Fecha de fin del evento formateada en español
  'codigo_certificado',   // Código legible CERT-XXXXXXXXXX
  'qr_code',              // Imagen QR con URL de verificación (elemento <img>)
] as const;

export type VariableType = typeof VARIABLE_TYPES[number];

// ─────────────────────────────────────────────────────────────────────────────
// FUENTES WEB SOPORTADAS (Google Fonts)
// Cualquier font_family que no esté en la lista de sistema se importa vía CDN.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_FONTS = new Set([
  'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana',
  'Courier New', 'Palatino', 'Tahoma', 'Trebuchet MS', 'Impact',
  'Comic Sans MS', 'sans-serif', 'serif', 'monospace',
]);

const GOOGLE_FONT_MAP: Record<string, string> = {
  'Montserrat':       'Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400',
  'Open Sans':        'Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400',
  'Lato':             'Lato:ital,wght@0,300;0,400;0,700;0,900;1,400',
  'Raleway':          'Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400',
  'Oswald':           'Oswald:wght@300;400;500;600;700',
  'Roboto':           'Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400',
  'Poppins':          'Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400',
  'Nunito':           'Nunito:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400',
  'Ubuntu':           'Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,400',
};

/** Genera el bloque <link> de Google Fonts para las fuentes que no sean del sistema. */
function buildGoogleFontsLink(fontFamilies: string[]): string {
  const googleFonts = Array.from(new Set(fontFamilies))
    .filter(f => !SYSTEM_FONTS.has(f) && GOOGLE_FONT_MAP[f])
    .map(f => GOOGLE_FONT_MAP[f]);

  if (googleFonts.length === 0) return '';

  const familyParams = googleFonts.map(f => `family=${f}`).join('&');
  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
  return `<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />\n  <link rel="stylesheet" href="${href}" />`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────
interface CampoPlantilla {
  id: string;
  tipo_campo: string;
  etiqueta: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  font_family: string;
  font_weight: string;
  font_size: number;
  color: string;
  text_align: string;
  line_height: number;
  letter_spacing: number;
  auto_fit: boolean;
  visible: boolean;
  orden: number;
}

interface CertificateRenderData {
  /** UUID del job de certificado */
  job_id: string;
  /** UUID del tenant */
  tenant_id: string;
  /** UUID del evento */
  evento_id: string;
  /** UUID del participante */
  persona_id: string;
}

export interface RenderedCertificate {
  html: string;
  width_px: number;
  height_px: number;
  codigo_certificado: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATO DE FECHA EN ESPAÑOL (Colombia)
// ─────────────────────────────────────────────────────────────────────────────
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateES(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';
  const day   = d.getUTCDate();
  const month = MESES_ES[d.getUTCMonth()];
  const year  = d.getUTCFullYear();
  return `${day} de ${month} de ${year}`;
}

function todayES(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return `${now.getDate()} de ${MESES_ES[now.getMonth()]} de ${now.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO DE CERTIFICADO LEGIBLE
// ─────────────────────────────────────────────────────────────────────────────
export function buildCertCode(job_id: string): string {
  return `CERT-${job_id.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR DE QR EN BASE64
// ─────────────────────────────────────────────────────────────────────────────
async function generateQRBase64(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function buildCertificateHtml(data: CertificateRenderData): Promise<RenderedCertificate> {
  const prefix = `[CertRenderer job=${data.job_id.slice(0, 8)}]`;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return ''; } } }
  );

  // ── 1. Cargar persona ────────────────────────────────────────────────────
  const { data: persona, error: personaErr } = await supabase
    .from('personas')
    .select('nombres, apellidos, nombre_completo, numero_documento, tipo_documento, correo')
    .eq('id', data.persona_id)
    .single();

  if (personaErr || !persona) {
    throw new Error(`${prefix} Persona no encontrada (id=${data.persona_id}): ${personaErr?.message}`);
  }

  const nombreCompleto =
    persona.nombre_completo?.trim() ||
    `${persona.nombres ?? ''} ${persona.apellidos ?? ''}`.trim();

  console.log(`${prefix} Persona: "${nombreCompleto}" (doc: ${persona.numero_documento ?? 'n/a'})`);

  // ── 2. Cargar evento + plantilla ─────────────────────────────────────────
  const { data: evento, error: eventoErr } = await supabase
    .from('eventos')
    .select('titulo, fecha_inicio, fecha_fin, plantilla_certificado_id')
    .eq('id', data.evento_id)
    .single();

  if (eventoErr || !evento) {
    throw new Error(`${prefix} Evento no encontrado (id=${data.evento_id}): ${eventoErr?.message}`);
  }
  if (!evento.plantilla_certificado_id) {
    throw new Error(`${prefix} El evento "${evento.titulo}" no tiene plantilla de certificado configurada.`);
  }

  // ── 3. Cargar plantilla ──────────────────────────────────────────────────
  const { data: plantilla, error: plantillaErr } = await supabase
    .from('plantillas_certificado')
    .select('id, nombre, archivo_base_url, ancho_px, alto_px')
    .eq('id', evento.plantilla_certificado_id)
    .single();

  if (plantillaErr || !plantilla) {
    throw new Error(`${prefix} Plantilla no encontrada (id=${evento.plantilla_certificado_id}): ${plantillaErr?.message}`);
  }
  if (!plantilla.archivo_base_url) {
    throw new Error(`${prefix} La plantilla "${plantilla.nombre}" no tiene imagen de fondo configurada.`);
  }

  // Pre-cargar imagen de fondo como base64 para que Puppeteer no haga requests HTTP externos.
  // Sin esto, waitUntil:'networkidle0' bloquea hasta que la imagen carga desde Supabase Storage,
  // pudiendo hacer timeout. Con base64, el HTML es autocontenido y no hay red en Puppeteer.
  let bgImageSrc = plantilla.archivo_base_url;
  try {
    const imgRes = await fetch(plantilla.archivo_base_url);
    if (imgRes.ok) {
      const imgBuf  = await imgRes.arrayBuffer();
      const imgB64  = Buffer.from(imgBuf).toString('base64');
      const ct      = imgRes.headers.get('content-type') || 'image/jpeg';
      bgImageSrc    = `data:${ct};base64,${imgB64}`;
      console.log(`${prefix} Imagen de fondo pre-cargada: ${(imgBuf.byteLength / 1024).toFixed(0)} KB (${ct})`);
    } else {
      console.warn(`${prefix} ⚠️ No se pudo pre-cargar imagen de fondo (HTTP ${imgRes.status}) — usando URL remota.`);
    }
  } catch (imgErr: any) {
    console.warn(`${prefix} ⚠️ Fetch de imagen de fondo falló (${imgErr?.message}) — usando URL remota.`);
  }

  // ── 4. Cargar campos de la plantilla ─────────────────────────────────────
  const { data: campos, error: camposErr } = await supabase
    .from('plantilla_campos_certificado')
    .select('*')
    .eq('plantilla_certificado_id', plantilla.id)
    .order('orden', { ascending: true });

  if (camposErr) {
    throw new Error(`${prefix} Error cargando campos de plantilla: ${camposErr.message}`);
  }

  // ── Normalizar nombres de columna: DB real → interfaz interna ───────────
  // La tabla plantilla_campos_certificado usa:  posicion_x, posicion_y, ancho_caja, alto_caja
  // El renderer usa internamente:               pos_x,      pos_y,      width,      height
  // Sin esta normalización los estilos quedan "undefinedpx" y los campos no se ven.
  const camposList: CampoPlantilla[] = (campos ?? []).map((raw: any) => {
    const normalized: CampoPlantilla = {
      ...raw,
      pos_x:  raw.posicion_x  ?? raw.pos_x  ?? 0,
      pos_y:  raw.posicion_y  ?? raw.pos_y  ?? 0,
      width:  raw.ancho_caja  ?? raw.width  ?? 100,
      height: raw.alto_caja   ?? raw.height ?? 50,
    };
    console.log(
      `${prefix} [Campo raw] tipo=${raw.tipo_campo} | posicion_x=${raw.posicion_x} posicion_y=${raw.posicion_y} ancho_caja=${raw.ancho_caja} alto_caja=${raw.alto_caja}` +
      ` → [normalizado] pos_x=${normalized.pos_x} pos_y=${normalized.pos_y} width=${normalized.width} height=${normalized.height}`,
    );
    return normalized;
  });

  if (camposList.length === 0) {
    console.warn(`${prefix} ⚠️ La plantilla "${plantilla.nombre}" no tiene campos configurados — el certificado sólo mostrará la imagen de fondo.`);
  } else {
    console.log(`${prefix} ${camposList.length} campo(s) cargados y normalizados de plantilla "${plantilla.nombre}".`);
  }

  // ── 5. Construir diccionario de variables ────────────────────────────────
  const codigo       = buildCertCode(data.job_id);
  const publicBase   = process.env.PUBLIC_BASE_URL ?? '';
  const verificacionUrl = `${publicBase}/verificar?cert=${data.job_id}`;

  const variables: Record<string, string> = {
    nombre_completo:     nombreCompleto,
    nombres:             persona.nombres        ?? '',
    apellidos:           persona.apellidos      ?? '',
    numero_documento:    persona.numero_documento ?? '',
    tipo_documento:      persona.tipo_documento  ?? '',
    nombre_evento:       evento.titulo           ?? '',
    evento:              evento.titulo           ?? '',      // alias legacy
    fecha_emision:       todayES(),
    fecha:               todayES(),                          // alias legacy
    fecha_inicio_evento: formatDateES(evento.fecha_inicio),
    fecha_fin_evento:    formatDateES(evento.fecha_fin),
    codigo_certificado:  codigo,
    // qr_code se renderiza como <img>, no en este diccionario
  };

  // Advertir si algún campo crítico está vacío
  if (!nombreCompleto) {
    console.warn(`${prefix} ⚠️ nombre_completo está vacío para persona ${data.persona_id}.`);
  }
  if (!evento.titulo) {
    console.warn(`${prefix} ⚠️ nombre_evento está vacío para evento ${data.evento_id}.`);
  }

  // ── 6. Generar QR si hay campo de tipo qr_code ───────────────────────────
  let qrBase64 = '';
  const campoQr = camposList.find(c => c.tipo_campo === 'qr_code' && c.visible !== false);
  if (campoQr) {
    if (!publicBase) {
      console.warn(`${prefix} ⚠️ PUBLIC_BASE_URL no configurada — el QR apuntará a una URL vacía.`);
    }
    try {
      qrBase64 = await generateQRBase64(verificacionUrl);
      console.log(`${prefix} QR generado → ${verificacionUrl}`);
    } catch (qrErr) {
      console.error(`${prefix} ❌ Error generando QR:`, qrErr);
    }
  }

  // ── 7. Detectar fuentes web para inyección de Google Fonts ───────────────
  const usedFonts = camposList
    .filter(c => c.visible !== false && c.tipo_campo !== 'qr_code')
    .map(c => c.font_family ?? 'Arial');
  const googleFontsLink = buildGoogleFontsLink(usedFonts);

  // ── 8. Renderizar cada campo como elemento HTML posicionado ──────────────
  const camposHtml = camposList
    .filter(c => c.visible !== false)
    .map(campo => {
      const isQr = campo.tipo_campo === 'qr_code';

      const baseStyle = [
        `position: absolute`,
        `left: ${campo.pos_x}px`,
        `top: ${campo.pos_y}px`,
        `width: ${campo.width}px`,
        `height: ${campo.height}px`,
        `overflow: hidden`,
        `box-sizing: border-box`,
      ].join('; ');

      // ── Campo QR ────────────────────────────────────────────────
      if (isQr) {
        if (!qrBase64) {
          console.warn(`${prefix} ⚠️ Campo qr_code omitido por error en generación del QR.`);
          return '';
        }
        return `
          <div style="${baseStyle}; display: flex; align-items: center; justify-content: center;">
            <img
              src="${qrBase64}"
              alt="Código QR de verificación"
              style="width: 100%; height: 100%; object-fit: contain;"
            />
          </div>`;
      }

      // ── Campo de texto ──────────────────────────────────────────
      const valor = variables[campo.tipo_campo];

      if (valor === undefined) {
        console.warn(`${prefix} ⚠️ tipo_campo="${campo.tipo_campo}" no está en el catálogo de variables — campo omitido. Variables soportadas: ${Object.keys(variables).join(', ')}`);
        return '';
      }

      if (valor === '') {
        console.warn(`${prefix} ⚠️ tipo_campo="${campo.tipo_campo}" tiene valor vacío para esta persona/evento.`);
      }

      console.log(`${prefix} [Valor] tipo_campo="${campo.tipo_campo}" → valor="${valor.slice(0, 80)}"`);

      const fontSizePx    = campo.font_size      ?? 24;
      const lineHeight    = campo.line_height     ?? 1.2;
      const letterSpacing = campo.letter_spacing  ?? 0;
      const fontFamily    = campo.font_family     || 'Arial';
      const fontWeight    = campo.font_weight     || 'normal';
      const color         = campo.color           || '#000000';
      const textAlign     = campo.text_align      || 'left';

      const justify = textAlign === 'center' ? 'center'
                    : textAlign === 'right'  ? 'flex-end'
                    : 'flex-start';

      const autoFitAttr = campo.auto_fit ? ' data-autofit="1"' : '';

      const textStyle = [
        baseStyle,
        `font-family: '${fontFamily}', Arial, sans-serif`,
        `font-size: ${fontSizePx}px`,
        `font-weight: ${fontWeight}`,
        `color: ${color}`,
        `text-align: ${textAlign}`,
        `line-height: ${lineHeight}`,
        `letter-spacing: ${letterSpacing}px`,
        `display: flex`,
        `align-items: center`,
        `justify-content: ${justify}`,
        `word-break: break-word`,
        `white-space: normal`,
      ].join('; ');

      console.log(`${prefix} [Estilo] tipo_campo="${campo.tipo_campo}" → ${baseStyle}`);

      const escapedValue = valor
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `
        <div style="${textStyle}"${autoFitAttr}>
          <span>${escapedValue}</span>
        </div>`;
    })
    .join('\n');

  // ── 9. Ensamblar HTML completo ───────────────────────────────────────────
  const width  = plantilla.ancho_px || 1123;
  const height = plantilla.alto_px  || 794;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado - ${nombreCompleto.replace(/</g, '&lt;')}</title>
  ${googleFontsLink}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: white;
    }
    .certificate-container {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
    }
    .certificate-bg {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .certificate-fields {
      position: absolute;
      top: 0; left: 0;
      width: ${width}px;
      height: ${height}px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <img
      class="certificate-bg"
      src="${bgImageSrc}"
      alt="Plantilla de certificado"
    />
    <div class="certificate-fields">
      ${camposHtml}
    </div>
  </div>

  <!-- data-autofit elements are adjusted by pdfGenerator after document.fonts.ready -->
</body>
</html>`;

  // ── Validación del HTML final antes de enviarlo a generatePDF ───────────
  const rendered   = camposList.filter(c => c.visible !== false);
  const tiposOk    = rendered.map(c => c.tipo_campo).join(', ');
  const hasUndefinedPx = html.includes('undefinedpx');
  if (hasUndefinedPx) {
    // Detectar qué campos tienen coordenadas inválidas
    const badCampos = rendered.filter(c => c.pos_x === undefined || c.pos_y === undefined || c.width === undefined || c.height === undefined);
    console.error(`${prefix} ❌ HTML contiene "undefinedpx" — ${badCampos.length} campo(s) con coordenadas inválidas: ${badCampos.map(c => c.tipo_campo).join(', ')}`);
    throw new Error(`${prefix} HTML inválido: coordenadas "undefinedpx" detectadas. Revisar normalización de columnas (posicion_x/ancho_caja).`);
  }
  console.log(`${prefix} ✅ HTML válido: ${html.length} chars | ${rendered.length} campo(s) [${tiposOk}] | Persona: "${nombreCompleto}" | Evento: "${evento.titulo}" | Código: ${codigo}`);

  return {
    html,
    width_px:          width,
    height_px:         height,
    codigo_certificado: codigo,
  };
}
