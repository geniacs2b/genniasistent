-- =================================================================
-- MIGRATION 08: Lógica de Trial — estado inicial correcto para nuevos tenants
--
-- Cambios:
--   1. Añade 'trial' al CHECK de billing_status
--   2. Cambia DEFAULT de billing_status a 'trial' (era 'inactive')
--   3. Cambia DEFAULT de current_plan_key a NULL (era 'starter')
--   4. Cambia DEFAULT de certificate_quota a 5 (era 100)
--   5. Backfill: tenants sin plan pago → billing_status='trial', quota=5, plan_key=NULL
-- =================================================================

-- ─────────────────────────────────────────────────────────────────
-- 1. Ampliar CHECK constraint de billing_status para incluir 'trial'
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Buscar el nombre del constraint existente en billing_status
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.tenants'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%billing_status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tenants DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Constraint % eliminado', constraint_name;
  END IF;
END $$;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_billing_status_check
  CHECK (billing_status IN ('trial', 'inactive', 'active', 'past_due', 'cancelled'));

-- ─────────────────────────────────────────────────────────────────
-- 2. Cambiar DEFAULT de billing_status a 'trial'
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tenants
  ALTER COLUMN billing_status SET DEFAULT 'trial';

-- ─────────────────────────────────────────────────────────────────
-- 3. Cambiar DEFAULT de current_plan_key a NULL
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tenants
  ALTER COLUMN current_plan_key SET DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 4. Cambiar DEFAULT de certificate_quota a 5
--    (aplica solo a tenants futuros — el backfill cubre los existentes)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tenants
  ALTER COLUMN certificate_quota SET DEFAULT 5;

-- ─────────────────────────────────────────────────────────────────
-- 5. Backfill — tenants sin plan pago activo
--    Criterio: billing_status IN ('inactive', 'trial') AND current_plan_key IS NOT DISTINCT FROM 'starter'
--    → los marcamos como trial, quota=5, plan_key=NULL
-- ─────────────────────────────────────────────────────────────────
UPDATE public.tenants
SET
  billing_status    = 'trial',
  current_plan_key  = NULL,
  certificate_quota = 5
WHERE
  billing_status IN ('inactive', 'trial')
  AND (current_plan_key = 'starter' OR current_plan_key IS NULL)
  -- Solo si nunca tuvieron un pago APPROVED (doble seguridad)
  AND id NOT IN (
    SELECT DISTINCT tenant_id
    FROM public.payments
    WHERE status = 'APPROVED'
  );

-- Reporte de lo actualizado
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.tenants
  WHERE billing_status = 'trial' AND current_plan_key IS NULL;
  RAISE NOTICE 'Tenants en estado trial tras backfill: %', cnt;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Diagnóstico: distribución de billing_status post-migración
-- ─────────────────────────────────────────────────────────────────
SELECT billing_status, current_plan_key, COUNT(*) AS total
FROM public.tenants
GROUP BY billing_status, current_plan_key
ORDER BY billing_status, current_plan_key;
