-- ─────────────────────────────────────────────────────────────────────────────
-- DESBLOQUEO INMEDIATO: Resetear batches y jobs atascados
-- Ejecutar en Supabase SQL Editor ANTES de volver a intentar "Enviar Certificados"
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO 1: Ver qué hay atascado
SELECT
  id,
  evento_id,
  status,
  total_expected,
  total_processed,
  created_at,
  now() - created_at AS tiempo_atascado
FROM public.certificate_batches
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- PASO 2: Ver los jobs de esos batches
SELECT
  cj.id,
  cj.batch_id,
  cj.status,
  cj.attempts,
  cj.last_error,
  cj.created_at
FROM public.certificate_jobs cj
JOIN public.certificate_batches cb ON cj.batch_id = cb.id
WHERE cb.status IN ('pending', 'processing')
ORDER BY cj.created_at DESC;

-- PASO 3: Resetear (ejecutar solo si PASO 1 muestra filas)
UPDATE public.certificate_batches
  SET status = 'failed'
  WHERE status IN ('pending', 'processing');

UPDATE public.certificate_jobs
  SET status = 'failed',
      last_error = 'Reseteado manualmente — batch atascado'
  WHERE status IN ('pending', 'processing');

-- PASO 4: Verificar que quedó limpio
SELECT status, COUNT(*)
FROM public.certificate_batches
GROUP BY status;

SELECT status, COUNT(*)
FROM public.certificate_jobs
GROUP BY status;
