import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Función que inyecta HTML crudo en un navegador Headless (optimizado para Vercel)
 * y emite un Buffer listo para ser guardado en base de datos o en disco.
 *
 * NOTA: Para funcionar en Vercel, este código debe correr en Node.js Runtime (no Edge Runtime).
 */
export async function generatePDF(
  htmlContent: string,
  width_px?: number,
  height_px?: number,
): Promise<Buffer> {
  let browser = null;

  try {
    // Configuraciones recomendadas para Vercel Serverless/AWS Lambda
    // spartcuz/chromium se encarga de descargar y proveer el ejecutable
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: (chromium as any).defaultViewport,
      executablePath: executablePath || process.env.CHROME_BIN,
      headless: (chromium as any).headless,
    });

    const page = await browser.newPage();

    // Si se reciben dimensiones de la plantilla, usarlas como viewport exacto
    if (width_px && height_px) {
      await page.setViewport({ width: width_px, height: height_px, deviceScaleFactor: 1 });
    }

    // Inyectamos el HTML de la plantilla en el entorno aislado del navegador
    await page.setContent(htmlContent, {
      // networkidle0 garantiza que la imagen de fondo remota y las fuentes de Google carguen
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 30000,
    });

    // Esperar a que todas las fuentes (incluidas Google Fonts) estén cargadas
    // ANTES de ejecutar el auto_fit para que las métricas sean correctas.
    await page.evaluate(() => document.fonts.ready);

    // Auto-fit: reducir font-size hasta que el texto entre en su caja.
    // Se ejecuta después de fonts.ready para medir con métricas de fuente correctas.
    await page.evaluate(() => {
      const els = document.querySelectorAll<HTMLElement>('[data-autofit]');
      els.forEach(container => {
        const span = container.querySelector<HTMLElement>('span');
        if (!span) return;
        const computed = window.getComputedStyle(span);
        let size = parseFloat(computed.fontSize);
        const minSize = 8;
        let iter = 0;
        while (iter++ < 80 && size > minSize) {
          if (
            span.scrollWidth  <= container.clientWidth &&
            span.scrollHeight <= container.clientHeight
          ) break;
          size -= 0.5;
          span.style.fontSize = size + 'px';
        }
      });
    });

    // Dimensiones de la plantilla o A4 horizontal como fallback
    const pdfBuffer = await page.pdf(
      width_px && height_px
        ? {
            width: `${width_px}px`,
            height: `${height_px}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          }
        : {
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
    );

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Crash crítico en renderizador Puppeteer:', error);
    throw new Error('Fallo al renderizar el binario del PDF. Verifica la complejidad del HTML o Timeouts.');
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
