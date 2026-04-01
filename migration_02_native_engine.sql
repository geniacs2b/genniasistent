-- =========================
-- MIGRATION 02: Native Engine (Ajustado)
-- =========================

-- =========================
-- 1. TENANTS (ajustes seguros)
-- =========================
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS certificate_quota int DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS total_consumed int DEFAULT 0;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS use_native_engine boolean DEFAULT false;

-- =========================
-- 2. LOTES DE CERTIFICADOS
-- =========================
CREATE TABLE IF NOT EXISTS public.certificate_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    total_expected int NOT NULL,
    total_processed int DEFAULT 0,
    total_errors int DEFAULT 0,
    status text DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed')),
    created_at timestamptz DEFAULT now()
);

-- =========================
-- 3. JOBS DE GENERACIÓN
-- =========================
CREATE TABLE IF NOT EXISTS public.certificate_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    batch_id uuid REFERENCES public.certificate_batches(id) ON DELETE CASCADE,
    evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,

    status text DEFAULT 'pending' CHECK (
        status IN ('pending','generating','generated','failed')
    ),

    attempts int DEFAULT 0,
    error_log text,
    pdf_url text,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =========================
-- 4. ENTREGAS DE EMAIL
-- =========================
CREATE TABLE IF NOT EXISTS public.email_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    certificate_job_id uuid NOT NULL REFERENCES public.certificate_jobs(id) ON DELETE CASCADE,

    email_to text NOT NULL,

    status text DEFAULT 'pending' CHECK (
        status IN ('pending','sent','failed','rejected','retrying')
    ),

    retry_count int DEFAULT 0,
    locked_at timestamptz,
    next_retry_at timestamptz,

    error_log text,
    dispatched_at timestamptz,

    created_at timestamptz DEFAULT now()
);

-- =========================
-- 5. CONFIGURACIÓN DE CORREO (OAuth)
-- =========================
CREATE TABLE IF NOT EXISTS public.email_configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

    provider text DEFAULT 'google_oauth',
    sender_email text NOT NULL,

    access_token text,
    refresh_token text,
    token_expires_at timestamptz,

    is_active boolean DEFAULT false,

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =========================
-- 6. FUNCIÓN DE CONSUMO (SEGURA)
-- =========================
CREATE OR REPLACE FUNCTION decrement_tenant_quota(p_tenant_id uuid, amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET certificate_quota = GREATEST(0, certificate_quota - amount),
      total_consumed = total_consumed + amount
  WHERE id = p_tenant_id;
END;
$$;

-- =========================
-- 7. ÍNDICES (performance)
-- =========================
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON certificate_batches(tenant_id);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON certificate_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON certificate_jobs(status);

CREATE INDEX IF NOT EXISTS idx_email_tenant ON email_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_deliveries(status);