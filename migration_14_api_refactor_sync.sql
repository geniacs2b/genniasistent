-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 14: Alias para descontar_consumo_certificados
-- Sincroniza la nomenclatura esperada por el usuario con la lógica interna.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.descontar_consumo_certificados(
  p_tenant_id uuid,
  p_cantidad int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reutilizamos la lógica de decrement_tenant_quota
  PERFORM public.decrement_tenant_quota(p_tenant_id, p_cantidad);
END;
$$;

COMMENT ON FUNCTION public.descontar_consumo_certificados(uuid, int) IS 
'Alias de decrement_tenant_quota para compatibilidad con la nomenclatura del sistema de distribución.';
