import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const qstash = new Client({ 
    token: process.env.QSTASH_TOKEN || "",
    baseUrl: process.env.QSTASH_URL
});

export const dynamic = 'force-dynamic';

// Esta ruta la llama el administrador desde la UI cuando clickea "Generar Lote"
export async function POST(req: NextRequest) {
  try {
    const { evento_id, tenant_id, participantes_ids } = await req.json();

    if (!evento_id || !tenant_id || !participantes_ids || participantes_ids.length === 0) {
      return NextResponse.json({ error: "Parámetros insuficientes" }, { status: 400 });
    }

    // Validación preventiva de configuraciones de QStash
    if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_URL) {
        console.error(`[QStash] Error: QSTASH_TOKEN o QSTASH_URL no configurados.`);
        return NextResponse.json({ 
            error: `Configuración de QStash incompleta`,
            tip: "Asegúrate de definir QSTASH_TOKEN y QSTASH_URL en .env.local" 
        }, { status: 500 });
    }

    console.log(`[QStash] Usando URL: ${process.env.QSTASH_URL}`);

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return '' } } }
    );

    // 1. Verificar cuota disponible (Logging para debug)
    console.log(`[Batch Engine] Iniciando validación de cuota para tenant_id: ${tenant_id}`);

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, certificate_quota')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error("[Batch Engine] Error al leer tenant:", tenantError);
      throw new Error(`Tenant no encontrado o error en base de datos: ${tenantError.message}`);
    }

    if (!tenant) {
      console.error("[Batch Engine] Tenant no devuelto por la consulta.");
      throw new Error("La empresa no existe o no se pudo recuperar por falta de acceso (RLS).");
    }

    console.log(`[Batch Engine] Tenant recuperado: ${tenant.name}. Cuota: ${tenant.certificate_quota}. Solicitados: ${participantes_ids.length}`);

    if (tenant.certificate_quota < participantes_ids.length) {
       console.warn(`[Batch Engine] Cuota insuficiente: ${tenant.certificate_quota} < ${participantes_ids.length}`);
       return NextResponse.json({ 
          error: "Cuota de certificados insuficiente",
          total_available: tenant.certificate_quota,
          total_requested: participantes_ids.length
       }, { status: 402 });
    }

    // 2. Crear el Batch Master
    // BUG-FIX: 'pending' no es un valor válido en el CHECK de certificate_batches → usar 'in_progress'
    const { data: batch, error: batchError } = await supabase.from('certificate_batches')
      .insert({
        tenant_id,
        evento_id,
        total_expected: participantes_ids.length,
        status: 'in_progress',
      })
      .select().single();

    if (batchError || !batch) throw new Error(batchError?.message);

    // 3. Crear los Jobs en DB y Encolar a QStash masivamente
    // BUG-FIX: columna real es persona_id, no participante_id
    const jobsToInsert = participantes_ids.map((pId: string) => ({
      tenant_id,
      evento_id,
      batch_id: batch.id,
      persona_id: pId,
      status: 'pending',
    }));

    const { data: insertedJobs, error: insertError } = await supabase.from('certificate_jobs')
      .insert(jobsToInsert).select();

    if (insertError) throw new Error(insertError.message);

    // QStash Fan-Out: Enviamos todo a la cola para Worker de PDFs
    const publicBaseUrl = process.env.PUBLIC_BASE_URL;

    // Validación de Runtime requerida
    if (!publicBaseUrl || !publicBaseUrl.startsWith("https://") || publicBaseUrl.includes("localhost") || publicBaseUrl.includes("127.0.0.1")) {
      console.error("[Batch Engine] Error: PUBLIC_BASE_URL inválida o no configurada para producción:", publicBaseUrl);
      throw new Error("Configuración de red incompleta: Se requiere PUBLIC_BASE_URL con HTTPS y dominio real.");
    }

    // Batch JSON para mandarlos a QStash
    const eventsToPublish = insertedJobs.map((job) => ({
        url: `${publicBaseUrl}/api/workers/generate-certificate`,
        body: JSON.stringify({
            tenant_id: tenant_id,
            batch_id:  batch.id,
            job_id:    job.id,
            evento_id: evento_id,
            persona_id: job.persona_id,
        }),
        retries: 2,
    }));

    // QStash publishJSON acepta lotes para no matar los rate limits
    console.log(`[QStash] Intentando publicar ${eventsToPublish.length} eventos a QStash...`);
    
    try {
        const qstashResponse = await qstash.batchJSON(eventsToPublish);
        console.log(`[QStash] Publicación exitosa. Message IDs retornados: ${qstashResponse.length}`);
    } catch (qstashError: any) {
        console.error("[QStash] Error de autenticación o red:", qstashError.message);
        throw new Error(`Fallo en comunicación con QStash: ${qstashError.message}`);
    }

    return NextResponse.json({
        success: true, 
        message: "Lote ingestado y enrutado al motor de colas", 
        batch_id: batch.id 
    });

  } catch (error: any) {
    console.error("Error en Ingesta Batch:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
