-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 09 — Crear función get_tenant_id_by_evento
-- Requerida por: registrar_inscripcion_evento RPC y políticas RLS de inscripcion
-- Problema: la función no estaba desplegada en producción → inscripción fallaba
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tenant_id_by_evento(p_evento_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.eventos WHERE id = p_evento_id;
$$;

COMMENT ON FUNCTION public.get_tenant_id_by_evento(uuid) IS
  'Devuelve el tenant_id del evento dado su ID. Usada por RLS y RPCs de inscripción.';
