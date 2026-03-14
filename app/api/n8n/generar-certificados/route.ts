import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const { evento_id } = await request.json();

    if (!evento_id) {
      return NextResponse.json(
        { ok: false, message: 'El ID del evento es requerido' },
        { status: 400 }
      );
    }

    // 1. Validar que el evento existe en Supabase
    const supabase = createClient();
    const { data: evento, error: dbError } = await supabase
      .from('eventos')
      .select('id, plantilla_certificado_id')
      .eq('id', evento_id)
      .single();

    if (dbError || !evento) {
      return NextResponse.json(
        { ok: false, message: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (!evento.plantilla_certificado_id) {
      return NextResponse.json(
        { ok: false, message: 'El evento no tiene una plantilla asociada' },
        { status: 400 }
      );
    }

    // 2. Obtener URL de n8n desde variables de entorno
    const n8nWebhookUrl = process.env.N8N_CERTIFICADOS_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_CERTIFICADOS_WEBHOOK_URL is not defined');
      return NextResponse.json(
        { ok: false, message: 'Configuración de automatización no disponible' },
        { status: 500 }
      );
    }

    // 3. Enviar a n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ evento_id }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n response error:', errorText);
      return NextResponse.json(
        { ok: false, message: 'La automatización de n8n devolvió un error' },
        { status: n8nResponse.status }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Automatización disparada con éxito',
    });
  } catch (error: any) {
    console.error('Error in /api/n8n/generar-certificados:', error);
    return NextResponse.json(
      { ok: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
