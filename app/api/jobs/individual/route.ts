import { NextRequest, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const qstash = new Client({ 
    token: process.env.QSTASH_TOKEN || "",
    baseUrl: process.env.QSTASH_URL
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { evento_id, persona_id, tenant_id: bodyTenantId, origen, tipo } = await req.json();

    if (!evento_id || !persona_id) {
      return NextResponse.json({ error: "Parámetros insuficientes (evento_id y persona_id requeridos)" }, { status: 400 });
    }

    const supabase = createServerClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return '' } } }
    );

    // 1. Obtener tenant_id si no viene en el body
    let tenant_id = bodyTenantId;
    if (!tenant_id) {
      const { data: evento, error: evError } = await supabase
        .from('eventos')
        .select('tenant_id')
        .eq('id', evento_id)
        .single();
      
      if (evError || !evento) {
        throw new Error("No se pudo determinar la empresa del evento.");
      }
      tenant_id = evento.tenant_id;
    }

    // 2. Verificar cuota
    const { data: tenant } = await supabase
      .from('tenants')
      .select('certificate_quota')
      .eq('id', tenant_id)
      .single();

    if (!tenant || tenant.certificate_quota < 1) {
      return NextResponse.json({ 
        error: "Cuota de certificados insuficiente",
        total_available: tenant?.certificate_quota ?? 0
      }, { status: 402 });
    }

    // 3. Crear el Job individual (sin batch_id)
    const { data: job, error: jobError } = await supabase
      .from('certificate_jobs')
      .insert({
        tenant_id,
        evento_id,
        persona_id,
        status: 'pending',
        error_log: `Origen: ${origen || 'manual'}${tipo === 'email_only' ? ' (Email Only)' : ''}`
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Error al crear job: ${jobError?.message}`);
    }

    // 4. Encolar a QStash
    const publicBaseUrl = process.env.PUBLIC_BASE_URL;
    if (!publicBaseUrl || !publicBaseUrl.startsWith("https://") || publicBaseUrl.includes("localhost")) {
      throw new Error("Configuración de red incompleta (PUBLIC_BASE_URL requerida en HTTPS).");
    }

    await qstash.publishJSON({
      url: `${publicBaseUrl}/api/workers/generate-certificate`,
      body: {
        tenant_id,
        job_id: job.id,
        evento_id,
        persona_id,
        tipo // opcional, para que el worker sepa si solo debe mandar email
      },
      retries: 2,
    });

    console.log(`[Individual Engine] Job ${job.id} encolado para persona ${persona_id}`);

    return NextResponse.json({
      success: true,
      message: "Proceso de envío individual iniciado.",
      job_id: job.id
    });

  } catch (error: any) {
    console.error("Error en Ingesta Individual:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
