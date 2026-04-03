-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 11 — Función para incrementar intentos en certificate_jobs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_job_attempts(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios de creador (bypass RLS)
AS $$
BEGIN
  UPDATE public.certificate_jobs
  SET attempts = COALESCE(attempts, 0) + 1,
      updated_at = now()
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION public.increment_job_attempts(uuid) IS 
  'Incrementa el contador de intentos de un trabajo de certificación de manera atómica.';
