-- Eliminar funciones previas si existen con firma igual
DROP FUNCTION IF EXISTS public.apply_approved_payment(text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.mark_payment_failed(text, public.payment_status, text, jsonb);

-- RPC: apply_approved_payment
CREATE FUNCTION public.apply_approved_payment(
  p_reference              text,
  p_wompi_transaction_id   text,
  p_payment_method_type    text,
  p_webhook_payload        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment   record;
  v_new_quota integer;
BEGIN
  SELECT *
    INTO v_payment
  FROM public.payments
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referencia de pago no encontrada');
  END IF;

  IF v_payment.status = 'APPROVED' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Pago ya procesado anteriormente');
  END IF;

  v_new_quota := CASE v_payment.plan_key
    WHEN 'starter' THEN 500
    WHEN 'pro' THEN 3500
    WHEN 'enterprise' THEN 100000
    ELSE 0
  END;

  UPDATE public.payments
  SET
    status               = 'APPROVED',
    wompi_transaction_id = p_wompi_transaction_id,
    payment_method_type  = p_payment_method_type,
    webhook_payload      = p_webhook_payload,
    approved_at          = NOW(),
    updated_at           = NOW()
  WHERE id = v_payment.id;

  UPDATE public.tenants
  SET
    certificate_quota = v_new_quota,
    current_plan_key  = v_payment.plan_key,
    billing_status    = 'active',
    plan_activated_at = NOW(),
    plan_expires_at   = CASE
                          WHEN v_payment.is_annual THEN NOW() + INTERVAL '1 year'
                          ELSE NOW() + INTERVAL '1 month'
                        END
  WHERE id = v_payment.tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', v_payment.tenant_id,
    'plan_key', v_payment.plan_key,
    'quota_set', v_new_quota
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_approved_payment(text, text, text, jsonb) TO service_role;

-- RPC: mark_payment_failed
CREATE FUNCTION public.mark_payment_failed(
  p_reference            text,
  p_status               public.payment_status,
  p_wompi_transaction_id text,
  p_webhook_payload      jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment record;
BEGIN
  SELECT *
    INTO v_payment
  FROM public.payments
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referencia no encontrada');
  END IF;

  IF v_payment.status = 'APPROVED' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Pago ya aprobado — estado ignorado');
  END IF;

  UPDATE public.payments
  SET
    status               = p_status,
    wompi_transaction_id = p_wompi_transaction_id,
    webhook_payload      = p_webhook_payload,
    updated_at           = NOW()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_failed(text, public.payment_status, text, jsonb) TO service_role;