import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WompiService } from '@/lib/wompi';

/**
 * Webhook de Wompi — escucha eventos de cambio de estado de transacciones.
 * Wompi envía un POST a este endpoint cada vez que una transacción cambia de estado.
 *
 * IMPORTANTE: Siempre devolver 200. Si Wompi recibe ≠ 200, reintenta el webhook.
 * La idempotencia la maneja el RPC apply_approved_payment a nivel DB.
 */
export async function POST(req: NextRequest) {
  let txId   = '?';
  let txRef  = '?';
  let txStatus = '?';

  try {
    const body = await req.json();

    // ── 1. Solo procesar "transaction.updated" ───────────────────
    if (body.event !== 'transaction.updated') {
      return NextResponse.json({ received: true });
    }

    const tx = body?.data?.transaction;
    if (!tx) {
      console.error('[Webhook Wompi] Payload sin data.transaction');
      return NextResponse.json({ received: true });
    }

    txId     = tx.id;
    txRef    = tx.reference;
    txStatus = tx.status;

    console.log(`[Webhook Wompi] Recibido | TX=${txId} | ref=${txRef} | status=${txStatus}`);

    // ── 2. Validar firma del evento ──────────────────────────────
    if (!WompiService.validateEventSignature(body)) {
      console.error(`[Webhook Wompi] Firma inválida para TX=${txId} — rechazando`);
      // Devolver 401 para que Wompi no reintente (firma incorrecta = evento fraudulento)
      return NextResponse.json({ error: 'Firma de evento inválida' }, { status: 401 });
    }

    // ── 3. Procesar según estado ─────────────────────────────────
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; } } }
    );

    if (txStatus === 'APPROVED') {
      // Transacción aprobada → RPC transaccional + idempotente
      const { data: result, error: rpcError } = await supabaseAdmin.rpc(
        'apply_approved_payment',
        {
          p_reference:            txRef,
          p_wompi_transaction_id: txId,
          p_payment_method_type:  tx.payment_method_type ?? null,
          p_webhook_payload:      body,
        }
      );

      if (rpcError) {
        console.error(`[Webhook Wompi] RPC apply_approved_payment falló | TX=${txId}:`, rpcError.message);
        // Devolver 500 para que Wompi reintente
        return NextResponse.json({ error: 'Error al procesar el pago' }, { status: 500 });
      }

      console.log(
        `[Webhook Wompi] ✅ Pago aprobado procesado | TX=${txId} | ref=${txRef} | ` +
        `resultado=${JSON.stringify(result)}`
      );

    } else if (['DECLINED', 'VOIDED', 'ERROR'].includes(txStatus)) {
      // Pago fallido/anulado → RPC de marcado (no modifica el tenant)
      const { error: rpcError } = await supabaseAdmin.rpc(
        'mark_payment_failed',
        {
          p_reference:            txRef,
          p_status:               txStatus as 'DECLINED' | 'VOIDED' | 'ERROR',
          p_wompi_transaction_id: txId,
          p_webhook_payload:      body,
        }
      );

      if (rpcError) {
        console.error(`[Webhook Wompi] RPC mark_payment_failed falló | TX=${txId}:`, rpcError.message);
        return NextResponse.json({ error: 'Error al registrar el fallo' }, { status: 500 });
      }

      console.log(`[Webhook Wompi] ⚠️ Pago ${txStatus} registrado | TX=${txId} | ref=${txRef}`);

    } else {
      // Estado intermedio (ej: PENDING) — ignorar
      console.log(`[Webhook Wompi] Estado intermedio ignorado: ${txStatus} | TX=${txId}`);
    }

    // Siempre 200 para confirmar recepción a Wompi
    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error(`[Webhook Wompi] Error inesperado (TX=${txId}):`, err.message);
    // 500 → Wompi reintentará (útil para errores transitorios de red/DB)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
