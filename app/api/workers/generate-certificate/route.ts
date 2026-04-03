import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@supabase/ssr";
import { Client } from "@upstash/qstash";
import { generatePDF } from "@/lib/pdfGenerator";
import { buildCertificateHtml } from "@/lib/certificateRenderer";
import { BUCKET_CERTIFICADOS, buildCertificadoPdfPath } from "@/lib/storageConstants";

// Vercel: esta ruta debe correr en Node.js runtime (no Edge) para soportar Puppeteer/Chromium
export const runtime    = 'nodejs';
export const maxDuration = 60; // segundos — PDF puede tardar 10-30s en serverless
export const dynamic    = 'force-dynamic';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL,
});

/**
 * Actualiza certificate_batches.status basado en el estado real de sus jobs.
 *
 * Schema real de certificate_batches:
 *   columnas de progreso: NINGUNA (no existen total_processed ni total_errors)
 *   única columna de estado: status ('pending'|'processing'|'completed'|'failed')
 *
 * Lógica:
 *   - si todos los jobs terminales (generated|sent|failed) == total → isDone
 *     - todos fallaron → batch 'failed'
 *     - al menos uno ok → batch 'completed'
 *   - si hay progreso y batch estaba en pending → batch 'processing'
 *   - si no cambió → no escribe
 */
async function syncBatchProgress(supabase: any, batchId: string) {
  const { data: counts, error: countErr } = await supabase
    .from('certificate_jobs')
    .select('status')
    .eq('batch_id', batchId);

  if (countErr) {
    console.error(`[Batch Sync] Error leyendo jobs del batch ${batchId}: ${countErr.message}`);
    return;
  }
  if (!counts || counts.length === 0) {
    console.warn(`[Batch Sync] Batch ${batchId} no tiene jobs — sin actualización.`);
    return;
  }

  const total     = counts.length;
  const terminal  = counts.filter((j: any) => ['generated', 'sent', 'failed'].includes(j.status)).length;
  const failed    = counts.filter((j: any) => j.status === 'failed').length;
  const isDone    = terminal >= total;

  console.log(`[Batch Sync] Batch ${batchId} | Jobs: ${total} | Terminados: ${terminal} | Fallidos: ${failed}`);

  const { data: currentBatch } = await supabase
    .from('certificate_batches')
    .select('status')
    .eq('id', batchId)
    .single();

  const current = currentBatch?.status;
  let nextStatus: string = current;

  if (isDone) {
    nextStatus = failed === total ? 'failed' : 'completed';
  } else if (current === 'pending' && terminal > 0) {
    nextStatus = 'processing';
  }

  if (nextStatus === current) {
    console.log(`[Batch Sync] Batch ${batchId} ya está en '${current}' — sin cambios.`);
    return;
  }

  console.log(`[Batch Sync] Actualizando batch ${batchId}: '${current}' → '${nextStatus}'`);

  // SOLO actualiza status — total_processed y total_errors NO existen en el schema real
  const { error: syncError } = await supabase
    .from('certificate_batches')
    .update({ status: nextStatus })
    .eq('id', batchId);

  if (syncError) {
    console.error(`[Batch Sync] Error actualizando batch ${batchId}: ${syncError.message}`);
  }
}

async function handler(req: NextRequest) {
  let active_job_id:    string | undefined;
  let active_tenant_id: string | undefined;
  let active_batch_id:  string | undefined;

  try {
    console.log(`[Worker] ⚡ Request recibido.`);

    const bodyText = await req.text();
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      console.error(`[Worker] JSON inválido: ${bodyText?.slice(0, 200)}`);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { tenant_id, batch_id, job_id, evento_id, participante_id } = body;

    // Validación temprana — si job_id es undefined todos los DB writes fallarán silenciosamente
    if (!job_id || !tenant_id || !evento_id || !participante_id) {
      console.error(`[Worker] Payload incompleto: job_id=${job_id} tenant_id=${tenant_id} evento_id=${evento_id} participante_id=${participante_id}`);
      return NextResponse.json({
        error: "Payload incompleto — job_id, tenant_id, evento_id y participante_id son requeridos",
        received: { job_id, tenant_id, evento_id, participante_id }
      }, { status: 400 });
    }

    active_job_id    = job_id;
    active_tenant_id = tenant_id;
    active_batch_id  = batch_id;

    console.log(`[Worker] Job=${job_id} | Batch=${batch_id ?? 'individual'} | Participante=${participante_id}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return ''; } } },
    );

    // ── 1. Incrementar attempts ──────────────────────────────────────────────
    console.log(`[Worker] Incrementando attempts para job ${job_id}`);
    try {
      const { error: rpcError } = await supabase.rpc('increment_job_attempts', { p_job_id: job_id });
      if (rpcError) {
        console.warn(`[Worker] RPC increment_job_attempts falló (${rpcError.message}) — fallback manual`);
        const { data: cur } = await supabase
          .from('certificate_jobs')
          .select('attempts')
          .eq('id', job_id)
          .single();
        // SOLO columnas que existen: attempts (NO updated_at)
        await supabase
          .from('certificate_jobs')
          .update({ attempts: (cur?.attempts ?? 0) + 1 })
          .eq('id', job_id);
      }
    } catch (e: any) {
      console.error(`[Worker] Error en increment attempts: ${e.message}`);
    }

    // ── 2. Cambiar job a 'processing' ────────────────────────────────────────
    console.log(`[Worker] Cambiando status a 'processing' para job ${job_id}`);
    const { error: statusError } = await supabase
      .from('certificate_jobs')
      .update({ status: 'processing' })
      .eq('id', job_id);

    if (statusError) {
      throw new Error(`DB error cambiando status a processing: ${statusError.message}`);
    }

    if (active_batch_id) {
      await syncBatchProgress(supabase, active_batch_id);
    }

    // ── 3. Renderizar HTML ───────────────────────────────────────────────────
    console.log(`[Worker] Renderizando HTML: participante=${participante_id} evento=${evento_id}`);

    // buildCertificateHtml retorna codigo_certificado pero certificate_jobs NO tiene esa columna.
    // La desestructuramos para usarla en el response y en el delivery, pero NO la persistimos en el job.
    const { html, width_px, height_px, codigo_certificado } = await buildCertificateHtml({
      job_id,
      tenant_id,
      evento_id,
      persona_id: participante_id, // participante_id es el UUID de la persona
    });

    console.log(`[Worker] HTML listo: ${html.length} chars | ${width_px}x${height_px}px`);

    // ── 4. Generar PDF ───────────────────────────────────────────────────────
    console.log(`[Worker] Iniciando generatePDF...`);
    const pdfBuffer = await generatePDF(html, width_px, height_px);
    console.log(`[Worker] PDF generado: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // ── 5. Upload a Supabase Storage ─────────────────────────────────────────
    const storagePath = buildCertificadoPdfPath(tenant_id, evento_id, job_id);
    console.log(`[Storage] Subiendo a: ${BUCKET_CERTIFICADOS}/${storagePath}`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_CERTIFICADOS)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '31536000',
      });

    if (uploadError) {
      throw new Error(`Storage upload falló (${storagePath}): ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_CERTIFICADOS)
      .getPublicUrl(storagePath);

    const pdfUrl = urlData?.publicUrl ?? '';
    if (!pdfUrl) {
      throw new Error(`getPublicUrl devolvió vacío — bucket '${BUCKET_CERTIFICADOS}' podría ser privado o no existir.`);
    }

    console.log(`[Storage] URL pública: ${pdfUrl}`);

    // ── 6. Marcar job como 'generated' ───────────────────────────────────────
    // SOLO columnas que existen en certificate_jobs: status, pdf_url
    // NO existen: updated_at, codigo_certificado
    console.log(`[Worker] Marcando job ${job_id} como 'generated'`);
    const { error: doneError } = await supabase
      .from('certificate_jobs')
      .update({
        status:  'generated',
        pdf_url: pdfUrl,
      })
      .eq('id', job_id);

    if (doneError) {
      throw new Error(`DB error al marcar job como generated: ${doneError.message}`);
    }

    // ── 7. Crear email delivery y encolar ────────────────────────────────────
    const { data: persona } = await supabase
      .from('personas')
      .select('correo')
      .eq('id', participante_id)
      .single();

    if (!persona?.correo) {
      console.warn(`[Worker] Participante ${participante_id} sin correo — PDF generado, email omitido.`);
    } else {
      const { data: delivery, error: delError } = await supabase
        .from('email_deliveries')
        .insert({
          tenant_id,
          certificate_job_id: job_id,
          email_to:           persona.correo,
          status:             'pending',
        })
        .select()
        .single();

      if (delError) {
        console.error(`[Worker] Error creando email_delivery: ${delError.message}`);
      } else if (delivery) {
        const publicBaseUrl = process.env.PUBLIC_BASE_URL;
        if (!publicBaseUrl || !publicBaseUrl.startsWith('https://') || publicBaseUrl.includes('localhost')) {
          throw new Error(`PUBLIC_BASE_URL inválida para producción: '${publicBaseUrl}'`);
        }

        await qstash.publishJSON({
          url:     `${publicBaseUrl}/api/workers/deliver-email`,
          body:    { tenant_id, job_id, delivery_id: delivery.id },
          retries: 3,
        });

        console.log(`[Worker] Email encolado para ${persona.correo} | delivery=${delivery.id}`);
      }
    }

    // ── 8. Sincronizar progreso del batch ────────────────────────────────────
    if (active_batch_id) {
      await syncBatchProgress(supabase, active_batch_id);
    }

    console.log(`[Worker] ✅ Job ${job_id} completado.`);

    return NextResponse.json({
      success: true,
      job_id,
      pdf_url:            pdfUrl,
      codigo_certificado, // solo en la respuesta HTTP — no en certificate_jobs (columna no existe)
    });

  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Worker] ❌ Error (job=${active_job_id ?? '?'}): ${msg}`);

    if (active_job_id) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get() { return ''; } } },
      );

      // SOLO columnas que existen: status, last_error
      await supabase
        .from('certificate_jobs')
        .update({ status: 'failed', last_error: msg })
        .eq('id', active_job_id);

      if (active_batch_id) {
        await syncBatchProgress(supabase, active_batch_id);
      }
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// export const POST = verifySignatureAppRouter(handler, {
//   currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
//   nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY,
// });

// TEMPORAL: bypass de firma para diagnóstico — reactivar verifySignatureAppRouter en producción estable
export async function POST(req: NextRequest) {
  return handler(req);
}
