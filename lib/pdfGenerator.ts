import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Genera un PDF a partir de HTML crudo usando Puppeteer + @sparticuz/chromium.
 * Optimizado para Vercel Serverless (Node.js runtime, no Edge).
 *
 * REQUISITO en next.config.mjs:
 *   serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
 * Sin esto, webpack bundlea el paquete y executablePath() no encuentra el binario.
 */
export async function generatePDF(
  htmlContent: string,
  width_px?: number,
  height_px?: number,
): Promise<Buffer> {
  let browser = null;

  // Logs de diagnóstico antes de lanzar el browser
  console.log(`[PDF] Iniciando generación | HTML: ${htmlContent.length} chars | Dims: ${width_px ?? 'A4'}x${height_px ?? 'A4'}`);
  const hasExternalImages = htmlContent.includes('<img') && htmlContent.includes('http');
  const hasGoogleFonts    = htmlContent.includes('fonts.googleapis.com');
  const hasBase64Images   = htmlContent.includes('data:image/');
  console.log(`[PDF] HTML contiene: imágenes externas=${hasExternalImages} | base64=${hasBase64Images} | Google Fonts=${hasGoogleFonts}`);

  const startMs = Date.now();

  try {
    const executablePath = await chromium.executablePath();
    console.log(`[PDF] executablePath: ${executablePath || 'vacío — usará CHROME_BIN'}`);

    if (!executablePath && !process.env.CHROME_BIN) {
      throw new Error('Chromium binary no encontrado. executablePath() vacío y CHROME_BIN no configurado.');
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      // @sparticuz/chromium v130+ ya no exporta defaultViewport.
      // null = no sobreescribir; el viewport se establece por página con page.setViewport().
      defaultViewport: null,
      executablePath: executablePath || process.env.CHROME_BIN,
      headless: true,
    });

    console.log(`[PDF] Browser lanzado (${Date.now() - startMs}ms)`);

    const page = await browser.newPage();

    if (width_px && height_px) {
      await page.setViewport({ width: width_px, height: height_px, deviceScaleFactor: 1 });
    }

    // 'domcontentloaded' en lugar de 'networkidle0':
    // networkidle0 espera 500ms de inactividad de red. Si hay recursos externos
    // (imágenes URL, Google Fonts) puede hacer timeout. domcontentloaded es inmediato
    // y el document.fonts.ready posterior se encarga de esperar fuentes web.
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    console.log(`[PDF] setContent completado (${Date.now() - startMs}ms)`);

    // Esperar a que las fuentes (incluyendo Google Fonts si se cargaron) estén listas
    await page.evaluate(() => document.fonts.ready);
    console.log(`[PDF] Fuentes listas (${Date.now() - startMs}ms)`);

    // Auto-fit: reducir font-size hasta que el texto entre en su caja
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

    const elapsed = Date.now() - startMs;
    const kb = (pdfBuffer.length / 1024).toFixed(1);
    console.log(`[PDF] ✅ PDF generado: ${kb} KB en ${elapsed}ms`);

    return Buffer.from(pdfBuffer);

  } catch (error: unknown) {
    const elapsed = Date.now() - startMs;
    // Propagar el error real de Puppeteer (no un mensaje genérico)
    const realMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PDF] ❌ Error tras ${elapsed}ms:`, error);
    throw new Error(`PDF generation failed: ${realMessage}`);
  } finally {
    if (browser !== null) {
      try { await browser.close(); } catch { /* ignorar error de cierre */ }
    }
  }
}
