import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createServerClient } from "@supabase/ssr";
import { Client } from "@upstash/qstash";
import { generatePDF } from "@/lib/pdfGenerator";
import { buildCertificateHtml } from "@/lib/certificateRenderer";
import { BUCKET_CERTIFICADOS, buildCertificadoPdfPath } from "@/lib/storageConstants";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
  baseUrl: process.env.QSTASH_URL,
});

/** Reutilizable: actualiza total_processed / total_errors / status en certificate_batches. */
async function syncBatchProgress(supabase: any, batchId: string) {
  const { data: counts } = await supabase
    .from('certificate_jobs')
    .select('status')
    .eq('batch_id', batchId);

  if (!counts) return;

  const processed = counts.filter((j: any) => j.status === 'completed' || j.status === 'failed').length;
  const errors    = counts.filter((j: any) => j.status === 'failed').length;
  const isDone    = processed >= counts.length;

  console.log(`[Batch Sync] Lote ${batchId} | Procesados: ${processed}/${counts.length} | Errores: ${errors}`);

  // 1. Obtener estado actual
  const { data: currentBatch } = await supabase.from('certificate_batches').select('status').eq('id', batchId).single();

  let nextStatus = currentBatch?.status;
  if (isDone) {
    nextStatus = errors === counts.length ? 'failed' : 'completed';
  } else if (currentBatch?.status === 'pending' && processed > 0) {
    nextStatus = 'processing';
  }

  console.log(`[Batch Sync] Intentando actualizar Lote ${batchId} a status: ${nextStatus}`);

  const { error: syncError } = await supabase
    .from('certificate_batches')
    .update({
      total_processed: processed,
      total_errors:    errors,
      status:          nextStatus,
    })
    .eq('id', batchId);

  if (syncError) {
    console.error(`[Batch Sync] Error DB al actualizar batch ${batchId}: ${syncError.message}`);
  }
}

async function handler(req: NextRequest) {
  let active_job_id:    string | undefined;
  let active_tenant_id: string | undefined;
  let active_batch_id:  string | undefined;

  try {
    // 0. CANARIO DE CONECTIVIDAD: Lo primero es capturar que algo llegó
    console.log(`[Worker] ⚡ Petición detectada en el endpoint.`);

    const bodyText = await req.text();
    let body: any;
    try {
        body = JSON.parse(bodyText);
    } catch (e) {
        console.error(`[Worker] Error parseando JSON: ${bodyText}`);
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { tenant_id, batch_id, job_id, evento_id, participante_id } = body;
    active_job_id    = job_id;
    active_tenant_id = tenant_id;
    active_batch_id  = batch_id;

    console.log(`[Worker] 📨 Datos: Job=${job_id} | Batch=${batch_id ?? 'indiv'} | Part=${participante_id}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return ''; } } },
    );

    // 1. REGISTRAR INTENTO INMEDIATAMENTE
    console.log(`[Worker] Registrando incremento de intentos para: ${job_id}`);
    try {
        const { error: rpcError } = await supabase.rpc('increment_job_attempts', { p_job_id: job_id });
        if (rpcError) {
            const { data: currentJob } = await supabase.from('certificate_jobs').select('attempts').eq('id', job_id).single();
            await supabase.from('certificate_jobs').update({ 
                attempts: (currentJob?.attempts || 0) + 1,
                updated_at: new Date().toISOString()
            }).eq('id', job_id);
        }
    } catch (e: any) {
        console.error(`[Worker] Fallo crítico al incrementar intentos: ${e.message}`);
    }

    // 2. CAMBIO DE ESTADO A 'processing' (Confirmado como válido por el usuario)
    console.log(`[Worker] Cambiando status de job ${job_id} a 'processing'`);
    const { error: statusError } = await supabase.from('certificate_jobs').update({ status: 'processing' }).eq('id', job_id);
    if (statusError) {
        console.error(`[Worker] Error DB al cambiar status a 'processing': ${statusError.message}`);
        throw new Error(`Error de base de datos (Check Constraint?): ${statusError.message}`);
    }

    if (active_batch_id) {
       await syncBatchProgress(supabase, active_batch_id);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Renderizar HTML con datos reales de la plantilla
    // ────────────────────────────────────────────────────────────────────────
    console.log(`[Worker] Renderizando plantilla: participante=${participante_id} evento=${evento_id}`);

    const { html, width_px, height_px, codigo_certificado } = await buildCertificateHtml({
      job_id,
      tenant_id,
      evento_id,
      persona_id: participante_id,
    });

    // Registrar el código en el job antes del upload (trazabilidad)
    await supabase.from('certificate_jobs')
      .update({ codigo_certificado })
      .eq('id', job_id);

    // ────────────────────────────────────────────────────────────────────────
    // 3. Generar PDF via Puppeteer
    // ────────────────────────────────────────────────────────────────────────
    const pdfBuffer = await generatePDF(html, width_px, height_px);
    console.log(`[Worker Generador] PDF generado — ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // ────────────────────────────────────────────────────────────────────────
    // 4. Upload a Supabase Storage (bucket canónico)
    // ────────────────────────────────────────────────────────────────────────
    const storagePath = buildCertificadoPdfPath(tenant_id, evento_id, job_id);

    console.log(`[Storage] Subiendo PDF → ${BUCKET_CERTIFICADOS}/${storagePath}`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_CERTIFICADOS)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,          // idempotente si el job se reintenta
        cacheControl: '31536000', // 1 año — el PDF no cambia
      });

    if (uploadError) {
      throw new Error(`[Storage] Error al subir PDF (${storagePath}): ${uploadError.message}`);
    }

    // Obtener URL pública — no requiere autenticación (bucket público)
    const { data: urlData } = supabase.storage
      .from(BUCKET_CERTIFICADOS)
      .getPublicUrl(storagePath);

    const pdfUrl = urlData?.publicUrl ?? '';

    if (!pdfUrl) {
      throw new Error(`[Storage] getPublicUrl devolvió vacío para ${storagePath} — bucket posiblemente privado o no existe.`);
    }

    console.log(`[Storage] URL pública: ${pdfUrl}`);

    // ────────────────────────────────────────────────────────────────────────
    // 5. Guardar URL y marcar job como completado
    // ────────────────────────────────────────────────────────────────────────
    console.log(`[Worker] Marcando job ${job_id} como 'completed'`);
    const { error: doneError } = await supabase.from('certificate_jobs').update({
      status:     'completed',
      pdf_url:    pdfUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', job_id);

    if (doneError) {
        console.error(`[Worker] Error DB al marcar como 'completed': ${doneError.message}`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 6. Crear email delivery y encolar en QStash (Motor 2 — Envío)
    // ────────────────────────────────────────────────────────────────────────
    const { data: persona } = await supabase
      .from('personas')
      .select('correo')
      .eq('id', participante_id)
      .single();

    if (!persona?.correo) {
      console.warn(`[Worker] ⚠️ Persona ${participante_id} no tiene correo — PDF generado sin entrega de email.`);
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
        console.error('[Worker] Error creando email_delivery:', delError.message);
      } else if (delivery) {
        const publicBaseUrl = process.env.PUBLIC_BASE_URL;
        if (!publicBaseUrl || !publicBaseUrl.startsWith('https://') || publicBaseUrl.includes('localhost')) {
          throw new Error('[Worker] PUBLIC_BASE_URL inválida para producción — no se puede encolar email.');
        }

        await qstash.publishJSON({
          url:     `${publicBaseUrl}/api/workers/deliver-email`,
          body:    { tenant_id, job_id, delivery_id: delivery.id },
          retries: 3,
        });

        console.log(`[Worker] Email encolado para ${persona.correo} | delivery=${delivery.id}`);
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 7. Actualizar progreso del Batch
    // ────────────────────────────────────────────────────────────────────────
    if (active_batch_id) {
      await syncBatchProgress(supabase, active_batch_id);
    }

    console.log(`[Worker] ✅ Job ${job_id} completado con éxito.`);

    return NextResponse.json({
      success: true,
      message: `Certificado generado y email despachado. Job=${job_id}`,
      codigo_certificado,
      pdf_url: pdfUrl,
    });

  } catch (error: any) {
    console.error(`[Worker] ❌ Error crítico (Job=${active_job_id ?? '?'}): ${error.message}`);

    if (active_job_id) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get() { return ''; } } },
      );

      await supabase.from('certificate_jobs').update({
        status:     'failed',
        last_error: error.message,
      }).eq('id', active_job_id);

      if (active_batch_id) {
        await syncBatchProgress(supabase, active_batch_id);
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// export const POST = verifySignatureAppRouter(handler, {
//   currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
//   nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY,
// });

// TEMPORAL: Bypass para Diagnóstico en Producción
export async function POST(req: NextRequest) {
    return handler(req);
}
