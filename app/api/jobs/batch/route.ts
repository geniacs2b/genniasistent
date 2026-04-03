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
    const { evento_id, tenant_id: bodyTenantId, participantes_ids: bodyIds } = await req.json();

    if (!evento_id) {
      return NextResponse.json({ error: "Parámetros insuficientes (evento_id requerido)" }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return '' } } }
    );

    // 1. Obtener tenant_id si no viene
    let tenant_id = bodyTenantId;
    if (!tenant_id) {
      const { data: ev, error: evErr } = await supabase
        .from('eventos')
        .select('tenant_id')
        .eq('id', evento_id)
        .single();
      if (evErr || !ev) throw new Error("No se pudo encontrar el tenant del evento.");
      tenant_id = ev.tenant_id;
    }

    // 2. Obtener participantes si no vienen (Criterio: Autorizados para certificado)
    let participantes_ids = bodyIds;
    if (!participantes_ids || participantes_ids.length === 0) {
      console.log(`[Batch Engine] Buscando participantes autorizados para evento: ${evento_id}`);
      
      // Usamos el RPC que ya encapsula toda la lógica de asistencia y habilitaciones
      const { data: statusList, error: stError } = await supabase
        .rpc('obtener_estado_certificados_evento', { p_evento_id: evento_id });

      if (stError) throw new Error(`Error invocando RPC: ${stError.message}`);

      // Filtramos por aquellos que tienen 'enviar' o 'reenviar' en accion_boton
      // Esto asegura que no enviemos a quienes no cumplen o ya tienen certificado enviado.
      participantes_ids = (statusList as any[])
        ?.filter(s => s.accion_boton === 'enviar' || s.accion_boton === 'reenviar')
        ?.map(s => s.persona_id) || [];

      if (participantes_ids.length === 0) {
        return NextResponse.json({ 
          success: true, 
          message: "No hay participantes pendientes de certificación para este evento.",
          count: 0 
        });
      }
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

    // Reutilizamos el cliente supabase ya declarado arriba

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
    console.log(`[Batch Engine] Intentando insertar lote para evento ${evento_id} con status: 'pending' (Alineado con check constraint)`);
    
    const { data: batch, error: batchError } = await supabase.from('certificate_batches')
      .insert({
        tenant_id,
        evento_id,
        total_expected: participantes_ids.length,
        status: 'pending',
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
