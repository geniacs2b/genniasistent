-- 1. Tabla de Historial de Pagos
CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR');

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL, -- Ej: TENANTID_TIMESTAMP
    wompi_transaction_id TEXT UNIQUE, -- El ID que devuelve Wompi tras el pago
    amount_in_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'COP',
    status payment_status NOT NULL DEFAULT 'PENDING',
    payment_method_type TEXT,
    plan_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices útiles para el webhook
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

-- 2. Añadir columnas a la tabla tenants si no existen (Manejo de cuotas y plan)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='current_plan_id') THEN
        ALTER TABLE public.tenants ADD COLUMN current_plan_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='certificate_quota') THEN
        ALTER TABLE public.tenants ADD COLUMN certificate_quota INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Crear Función RLS (Remote Procedure Call) para incrementar la cuota de forma segura desde el backend
CREATE OR REPLACE FUNCTION increment_tenant_quota(t_id UUID, qty INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.tenants 
  SET certificate_quota = COALESCE(certificate_quota, 0) + qty 
  WHERE id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
