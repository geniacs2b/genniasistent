import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const { evento_id, persona_id, origen } = await request.json();

    if (!evento_id || !persona_id) {
      return NextResponse.json(
        { ok: false, message: 'ID de evento y persona son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Validar que el evento existe y tiene plantilla
    const { data: evento, error: dbError } = await supabase
      .from('eventos')
      .select('id, plantilla_certificado_id, tenant_id, tenants(use_native_engine)')
      .eq('id', evento_id)
      .single();

    if (dbError || !evento) {
      return NextResponse.json({ ok: false, message: 'Evento no encontrado' }, { status: 404 });
    }

    if (!evento.plantilla_certificado_id) {
      return NextResponse.json(
        { ok: false, message: 'El evento no tiene una plantilla asociada' },
        { status: 400 }
      );
    }

    const tenantId       = evento.tenant_id;
    const useNativeEngine = (evento as any)?.tenants?.use_native_engine;

    // 2. Motor nativo: encolar como batch de 1 participante
    if (useNativeEngine && tenantId) {
      const publicBaseUrl = process.env.PUBLIC_BASE_URL;
      if (!publicBaseUrl) throw new Error('PUBLIC_BASE_URL no configurada');

      const batchResponse = await fetch(`${publicBaseUrl}/api/jobs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento_id,
          tenant_id:        tenantId,
          participantes_ids: [persona_id],
        }),
      });

      if (!batchResponse.ok) {
        const errData = await batchResponse.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, message: errData.error ?? 'Error en motor nativo de certificados' },
          { status: batchResponse.status || 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `Certificado individual encolado vía motor nativo (${origen ?? 'manual'})`,
      });
    }

    // 3. Motor legacy n8n
    const n8nWebhookUrl = process.env.N8N_CERTIFICADO_INDIVIDUAL_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('[enviar-certificado-individual] N8N_CERTIFICADO_INDIVIDUAL_WEBHOOK_URL no definida');
      return NextResponse.json(
        { ok: false, message: 'Configuración de automatización individual no disponible' },
        { status: 500 }
      );
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evento_id,
        persona_id,
        origen:               origen ?? 'manual',
        forzar_habilitacion: true,
      }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('[enviar-certificado-individual] n8n error:', errorText);
      return NextResponse.json(
        { ok: false, message: 'La automatización n8n devolvió un error' },
        { status: n8nResponse.status }
      );
    }

    return NextResponse.json({ ok: true, message: 'Envío de certificado individual iniciado' });

  } catch (error: any) {
    console.error('[enviar-certificado-individual] Error:', error);
    return NextResponse.json({ ok: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}
