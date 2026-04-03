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

      // REGLA DE NEGOCIO CRÍTICA:
      // El envío automático en lote solo procesa participantes con accion_boton='enviar'
      // (nunca enviados, que cumplen criterios). Los de accion_boton='reenviar' (envío fallido
      // previo) solo se reenvían manualmente por el administrador para evitar spam accidental.
      // Los de accion_boton=null (ya enviados o no elegibles) quedan excluidos.
      const yaEnviados   = (statusList as any[])?.filter(s => s.enviado === true).length ?? 0;
      const conFallo     = (statusList as any[])?.filter(s => s.accion_boton === 'reenviar').length ?? 0;

      participantes_ids = (statusList as any[])
        ?.filter(s => s.accion_boton === 'enviar')
        ?.map(s => s.persona_id) || [];

      console.log(`[Batch Engine] Elegibilidad evento ${evento_id}: total=${statusList?.length ?? 0} | a_enviar=${participantes_ids.length} | ya_enviados=${yaEnviados} | con_fallo=${conFallo}`);

      if (participantes_ids.length === 0) {
        const hayEnviados = yaEnviados > 0;
        const hayFallos   = conFallo > 0;
        const detalle = [
          hayEnviados ? `${yaEnviados} ya recibieron el certificado` : '',
          hayFallos   ? `${conFallo} con fallo previo (usar Reenvío Manual)` : '',
        ].filter(Boolean).join(', ');

        console.warn(`[Batch Engine] Sin participantes para envío automático | ${detalle}`);
        return NextResponse.json({
          error: `No hay participantes pendientes de envío en este evento.${ detalle ? ` (${detalle})` : '' }`,
          count: 0,
          ya_enviados: yaEnviados,
          con_fallo_manual: conFallo,
          total_en_rpc: statusList?.length ?? 0
        }, { status: 422 });
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
    
    // 0. IDEMPOTENCIA: Verificar si ya hay un lote en curso para este evento
    console.log(`[Batch Engine] Verificando lotes previos para evento: ${evento_id}`);

    const { data: activeBatches } = await supabase
      .from('certificate_batches')
      .select('id, status')
      .eq('evento_id', evento_id)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (activeBatches && activeBatches.length > 0) {
      const stuck = activeBatches[0];
      console.warn(`[Batch Engine] Lote activo detectado (id: ${stuck.id}, status: ${stuck.status}). Bloqueando duplicado.`);
      // IMPORTANTE: Retornamos 409 (no 200) para que automationService sepa que NADA fue creado.
      // Un 200 con is_duplicate silencia el error en el frontend y el usuario cree que funcionó.
      return NextResponse.json({
        error: `Ya existe un proceso en curso para este evento (lote ${stuck.id}, estado: ${stuck.status}). Espera a que termine o contacta soporte si lleva más de 1 hora.`,
        batch_id: stuck.id,
        is_duplicate: true
      }, { status: 409 });
    }

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
    console.log(`[Batch Engine] Insertando Master Batch para evento ${evento_id}...`);
    
    const { data: batch, error: batchError } = await supabase.from('certificate_batches')
      .insert({
        tenant_id,
        evento_id,
        total_expected: participantes_ids.length,
        status: 'pending',
      })
      .select().single();

    if (batchError || !batch) {
      console.error("[Batch Engine] Error al crear Master Batch:", batchError);
      throw new Error(`Error DB al crear lote: ${batchError?.message}`);
    }

    console.log(`[Batch Engine] Batch ${batch.id} creado con éxito. Insertando ${participantes_ids.length} jobs...`);

    // 3. Crear los Jobs en DB y Encolar a QStash masivamente
    // Normalizado: la columna física en certificate_jobs es participante_id
    const jobsToInsert = participantes_ids.map((pId: string) => ({
      tenant_id,
      evento_id,
      batch_id: batch.id,
      participante_id: pId,
      status: 'pending',
    }));

    const { data: insertedJobs, error: insertError } = await supabase.from('certificate_jobs')
      .insert(jobsToInsert).select();

    if (insertError) {
      console.error("[Batch Engine] Error al insertar jobs:", insertError);
      throw new Error(`Error DB al insertar trabajos individuales: ${insertError.message}`);
    }

    console.log(`[Batch Engine] ${insertedJobs?.length ?? 0} jobs persistidos. Preparando fan-out a QStash...`);

    // QStash Fan-Out: Enviamos todo a la cola para Worker de PDFs
    const publicBaseUrl = process.env.PUBLIC_BASE_URL;

    console.log(`[Batch Engine] Iniciando Fan-out para ${insertedJobs.length} trabajos.`);
    console.log(`[Batch Engine] URL Base Detectada: ${publicBaseUrl}`);

    // Validación de Runtime requerida
    if (!publicBaseUrl || !publicBaseUrl.startsWith("https://") || publicBaseUrl.includes("localhost")) {
      console.error("[Batch Engine] Error: PUBLIC_BASE_URL inválida para QStash:", publicBaseUrl);
      throw new Error(`Configuración de red incompleta: Se requiere PUBLIC_BASE_URL con HTTPS real. Actual: ${publicBaseUrl}`);
    }

    const workerUrl = `${publicBaseUrl}/api/workers/generate-certificate`;
    console.log(`[Batch Engine] Destino QStash: ${workerUrl}`);

    // IMPORTANTE: batchJSON serializa el body internamente (JSON.stringify).
    // Pasar body como OBJETO puro — NO usar JSON.stringify aquí o habrá doble serialización.
    // Bug confirmado en SDK @upstash/qstash v2: batchJSON hace JSON.stringify(message.body)
    // siempre, sin importar si ya es string. Resultado con stringify manual: body llega como
    // string al worker, destructuring da todo undefined, attempts=0 y jobs quedan en pending.
    const eventsToPublish = insertedJobs.map((job) => ({
        url: workerUrl,
        body: {
            tenant_id:       tenant_id,
            batch_id:        batch.id,
            job_id:          job.id,
            evento_id:       evento_id,
            participante_id: job.participante_id,
        },
        retries: 2,
    }));

    // QStash publishJSON acepta lotes para no matar los rate limits
    console.log(`[Batch Engine] Publicando lote de ${eventsToPublish.length} eventos a QStash...`);
    
    try {
        const qstashResponse = await qstash.batchJSON(eventsToPublish);
        console.log(`[Batch Engine] QStash aceptó los mensajes. Primeros IDs:`, qstashResponse.map(msg => msg.messageId).slice(0, 3));
        
        // Sincronización final: El batch se queda en 'pending' hasta que el primer worker lo pase a 'processing'
        await supabase.from('certificate_batches').update({ status: 'pending' }).eq('id', batch.id);
        console.log(`[Batch Engine] Lote ${batch.id} sincronizado como 'pending'.`);

    } catch (qstashError: any) {
        console.error("[Batch Engine] Error crítico de comunicación con QStash:", qstashError.message);
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
