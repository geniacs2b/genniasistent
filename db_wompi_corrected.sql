-- 1. Crear tipo de estado solo si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');
    END IF;
END $$;

-- 2. Crear Tabla de Pagos Correctivos
-- Nota: Si la tabla payments ya existía, se sugiere hacer un DROP previo si no tiene datos críticos, 
-- o usar 'IF NOT EXISTS' y luego ALTER de forma granular. Aquí usamos IF NOT EXISTS por seguridad.
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    reference TEXT UNIQUE NOT NULL,
    wompi_transaction_id TEXT UNIQUE,
    amount_in_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'COP',
    status public.payment_status NOT NULL DEFAULT 'PENDING',
    payment_method_type TEXT,
    wompi_status_message TEXT,
    approved_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    webhook_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger updated_at para payments
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropping if exists before create to ensure consistency
DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Alter de public.tenants (Solo columnas faltantes)
DO $$ 
BEGIN
    -- current_plan_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='current_plan_id') THEN
        ALTER TABLE public.tenants ADD COLUMN current_plan_id UUID REFERENCES public.plans(id);
    END IF;
    -- billing_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='billing_status') THEN
        ALTER TABLE public.tenants ADD COLUMN billing_status TEXT DEFAULT 'inactive';
    END IF;
    -- plan_activated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='plan_activated_at') THEN
        ALTER TABLE public.tenants ADD COLUMN plan_activated_at TIMESTAMPTZ;
    END IF;
    -- plan_expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='plan_expires_at') THEN
        ALTER TABLE public.tenants ADD COLUMN plan_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 5. Función Unificada de Aprobación de Pago Transaccional
CREATE OR REPLACE FUNCTION public.apply_approved_payment(
    p_reference TEXT,
    p_wompi_transaction_id TEXT,
    p_payment_method_type TEXT,
    p_webhook_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment record;
    v_plan record;
BEGIN
    -- 1. Buscar el pago por referencia bajo bloqueo (FOR UPDATE)
    SELECT * INTO v_payment 
    FROM public.payments 
    WHERE reference = p_reference 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment reference not found');
    END IF;

    -- 2. Manejo Idempotente (no reprocesar si ya está APPROVED)
    IF v_payment.status = 'APPROVED' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Payment already processed and approved');
    END IF;

    -- 3. Cargar información del plan del catálogo formal
    SELECT * INTO v_plan FROM public.plans WHERE id = v_payment.plan_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plan definition not found for this payment');
    END IF;

    -- 4. Actualizar estado del Pago
    UPDATE public.payments
    SET 
        status = 'APPROVED',
        wompi_transaction_id = p_wompi_transaction_id,
        payment_method_type = p_payment_method_type,
        approved_at = NOW(),
        processed_at = NOW(),
        webhook_payload = p_webhook_payload
    WHERE id = v_payment.id;

    -- 5. Actualizar el Tenant (Plan, Quota, Status, Fechas)
    UPDATE public.tenants
    SET 
        current_plan_id = v_payment.plan_id,
        certificate_quota = COALESCE(certificate_quota, 0) + v_plan.included_certificates,
        billing_status = 'active',
        plan_activated_at = NOW(),
        plan_expires_at = NOW() + INTERVAL '1 month'
    WHERE id = v_payment.tenant_id;

    RETURN jsonb_build_object(
        'success', true, 
        'tenant_id', v_payment.tenant_id, 
        'plan_id', v_payment.plan_id,
        'quota_added', v_plan.included_certificates
    );
END;
$$;
