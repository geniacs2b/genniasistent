import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WompiService } from '@/lib/wompi';

/**
 * Webhook de Wompi para actualizaciones de transacciones.
 * Valida la firma del evento y delega la aprobación a una RPC transaccional en Supabase.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.event;
    
    // 1. Validar que sea un evento de actualización de transacción
    if (eventType !== 'transaction.updated') {
      console.log(`[Webhook Wompi] Ignored event type: ${eventType}`);
      return NextResponse.json({ received: true });
    }

    const tx = body.data.transaction;

    // 2. Validación Robusta de Firma (Security Check)
    const isValid = WompiService.validateEventSignature(body);
    
    if (!isValid) {
      console.error(`[Webhook Wompi] Unauthorized: Invalid Signature for Reference ${tx.reference}`);
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    console.log(`[Webhook Wompi] processing TX ${tx.id} with status: ${tx.status}`);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Procesamiento solo bajo estado 'APPROVED'
    if (tx.status === 'APPROVED') {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('apply_approved_payment', {
        p_reference: tx.reference,
        p_wompi_transaction_id: tx.id,
        p_payment_method_type: tx.payment_method_type,
        p_webhook_payload: body // Almacenamos el JSON completo para auditoría
      });

      if (rpcError) {
        console.error(`[Webhook Wompi] RPC Error for Reference ${tx.reference}:`, rpcError);
        return NextResponse.json({ error: 'Database processing failed' }, { status: 500 });
      }

      console.log(`[Webhook Wompi] Transacción exitosa para tenant: ${rpcResult?.tenant_id}`);
    } else {
      // 4. Si falló o fue rechazada, solo actualizamos el pago
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: tx.status === 'DECLINED' ? 'DECLINED' : 'ERROR',
          wompi_transaction_id: tx.id,
          wompi_status_message: tx.status_message,
          webhook_payload: body
        })
        .eq('reference', tx.reference);

      if (updateError) {
        console.error(`[Webhook Wompi] Error updating failed payment status:`, updateError);
      }
    }

    // Retorno 200 obligatorio para Wompi
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Webhook Wompi] Internal Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
