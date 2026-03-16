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

    // 1. Validar que el evento existe y tiene plantilla
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

    // 2. Definir URL de n8n para envío individual
    // Usamos la URL proporcionada por el usuario
    const n8nWebhookUrl = "https://genia-cs2b.app.n8n.cloud/webhook/96aba212-1ed0-419d-ad70-97fadc68dd09";

    // 3. Enviar a n8n
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        evento_id, 
        persona_id, 
        origen: origen || 'manual',
        forzar_habilitacion: true 
      }),
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
      message: 'Envío de certificado individual iniciado',
    });
  } catch (error: any) {
    console.error('Error in /api/n8n/enviar-certificado-individual:', error);
    return NextResponse.json(
      { ok: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
