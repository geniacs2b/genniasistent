-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 15: Alinear schema real con el código del motor de certificados
--
-- PROBLEMA: El código fue refactorizado para usar:
--   - certificate_batches.status: 'pending' | 'processing' | 'completed' | 'failed'
--   - certificate_jobs: columna 'participante_id' (antes 'persona_id')
--   - certificate_jobs.status: 'pending' | 'processing' | 'completed' | 'failed'
--   - certificate_jobs: columna 'last_error' (alias del error del worker)
--
-- Pero el schema original (migration_02) tenía:
--   - certificate_batches.status CHECK: ('in_progress','completed','failed')
--   - certificate_jobs: columna 'persona_id'
--   - certificate_jobs.status CHECK: ('pending','generating','generated','failed')
--
-- Este script aplica los cambios de forma segura y condicional.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. certificate_batches: actualizar CHECK constraint de status
-- ORDEN CORRECTO: Drop constraint → UPDATE valores legacy → Add new constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Eliminar constraint anterior PRIMERO (para que UPDATE de valores legacy no falle)
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.certificate_batches'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.certificate_batches DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    RAISE NOTICE 'Constraint % eliminado de certificate_batches', v_constraint_name;
  END IF;
END $$;

-- 1b. Ahora actualizar filas con valores legacy (sin constraint que lo bloquee)
UPDATE public.certificate_batches
  SET status = 'processing'
  WHERE status = 'in_progress';

-- 1c. Agregar nuevo constraint con los valores correctos
ALTER TABLE public.certificate_batches
  ADD CONSTRAINT certificate_batches_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

ALTER TABLE public.certificate_batches
  ALTER COLUMN status SET DEFAULT 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. certificate_jobs: renombrar persona_id → participante_id (si aplica)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Solo renombrar si persona_id existe y participante_id NO existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'certificate_jobs'
      AND column_name = 'persona_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'certificate_jobs'
      AND column_name = 'participante_id'
  ) THEN
    ALTER TABLE public.certificate_jobs RENAME COLUMN persona_id TO participante_id;
    RAISE NOTICE 'certificate_jobs.persona_id renombrada a participante_id';
  ELSE
    RAISE NOTICE 'certificate_jobs.participante_id ya existe o persona_id no existe — sin cambios en columna';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. certificate_jobs: actualizar CHECK constraint de status
-- ORDEN CORRECTO: Drop constraint → UPDATE valores legacy → Add new constraint
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Eliminar constraint anterior PRIMERO
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.certificate_jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.certificate_jobs DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    RAISE NOTICE 'Constraint % eliminado de certificate_jobs', v_constraint_name;
  END IF;
END $$;

-- 3b. Actualizar filas con valores legacy (generating → processing, generated → completed)
UPDATE public.certificate_jobs
  SET status = 'processing'
  WHERE status = 'generating';

UPDATE public.certificate_jobs
  SET status = 'completed'
  WHERE status = 'generated';

-- 3c. Agregar nuevo constraint
ALTER TABLE public.certificate_jobs
  ADD CONSTRAINT certificate_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. certificate_jobs: agregar columna last_error si no existe
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.certificate_jobs
  ADD COLUMN IF NOT EXISTS last_error text;

ALTER TABLE public.certificate_jobs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RESETEAR batches stuck (pending/processing con más de 1 hora sin avanzar)
--    Esto desbloquea el guard de idempotencia para que nuevos lotes puedan crearse
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.certificate_batches
  SET status = 'failed'
  WHERE status IN ('pending', 'processing')
    AND created_at < now() - interval '1 hour';

-- También marcar los jobs huérfanos de esos batches como failed
UPDATE public.certificate_jobs
  SET status = 'failed',
      last_error = 'Lote padre reseteado por timeout (migration_15)'
  WHERE status IN ('pending', 'processing')
    AND batch_id IN (
      SELECT id FROM public.certificate_batches WHERE status = 'failed'
        AND created_at < now() - interval '1 hour'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Verificar estado final
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_participante_exists boolean;
  v_batch_check text;
  v_job_check text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'certificate_jobs' AND column_name = 'participante_id'
  ) INTO v_participante_exists;

  SELECT pg_get_constraintdef(oid) INTO v_batch_check
  FROM pg_constraint
  WHERE conrelid = 'public.certificate_batches'::regclass AND contype = 'c' AND conname = 'certificate_batches_status_check';

  SELECT pg_get_constraintdef(oid) INTO v_job_check
  FROM pg_constraint
  WHERE conrelid = 'public.certificate_jobs'::regclass AND contype = 'c' AND conname = 'certificate_jobs_status_check';

  RAISE NOTICE 'certificate_jobs.participante_id existe: %', v_participante_exists;
  RAISE NOTICE 'certificate_batches CHECK: %', v_batch_check;
  RAISE NOTICE 'certificate_jobs CHECK: %', v_job_check;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTA: Después de aplicar este script en Supabase SQL Editor,
-- verificar con:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'certificate_jobs';
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'certificate_batches'::regclass;
-- ─────────────────────────────────────────────────────────────────────────────
