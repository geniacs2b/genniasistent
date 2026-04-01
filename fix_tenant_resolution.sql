-- =================================================================
-- FIX: Resolución ambigua de tenant_id en RLS
-- Problema: si get_current_tenant_id() cae al fallback de tenant_users
--           y el user pertenece a dos tenants, LIMIT 1 devuelve un tenant
--           aleatorio que puede no coincidir con el tenant_id del INSERT,
--           rompiendo el WITH CHECK en todos los INSERT de tablas con RLS.
-- =================================================================

-- ─────────────────────────────────────────────────────────────────
-- PASO 1: Re-deployar función con lógica JWT-first
--         (idempotente, no rompe nada existente)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Prioridad 1: app_metadata.tenant_id del JWT (fuente canónica)
  SELECT NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid;
$$;

-- ─────────────────────────────────────────────────────────────────
-- PASO 2: Custom Access Token Hook
--
-- Este hook es invocado por Supabase en cada emisión de JWT.
-- Asegura que app_metadata.tenant_id siempre esté presente y fresco,
-- usando lo que ya está en app_metadata si existe (fuente de verdad),
-- o el primer tenant del usuario en tenant_users como fallback.
--
-- ACTIVAR EN: Supabase Dashboard → Authentication → Hooks
--   Hook type: Custom Access Token
--   Function:  public.custom_access_token_hook
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims         jsonb;
  app_meta       jsonb;
  current_tid    text;
  fallback_tid   uuid;
BEGIN
  claims   := event -> 'claims';
  app_meta := COALESCE(claims -> 'app_metadata', '{}'::jsonb);

  -- Leer el tenant_id ya almacenado en app_metadata (si existe)
  current_tid := app_meta ->> 'tenant_id';

  -- Si no existe, buscar el tenant del usuario en tenant_users (1 fila esperada)
  IF current_tid IS NULL OR current_tid = '' THEN
    SELECT tenant_id INTO fallback_tid
    FROM public.tenant_users
    WHERE user_id = (event ->> 'user_id')::uuid
    ORDER BY created_at ASC
    LIMIT 1;

    IF fallback_tid IS NOT NULL THEN
      app_meta := app_meta || jsonb_build_object('tenant_id', fallback_tid::text);
    END IF;
  END IF;

  -- Reconstruir claims con app_metadata actualizado
  claims := claims || jsonb_build_object('app_metadata', app_meta);

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permisos requeridos por Supabase para poder ejecutar el hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;


-- ─────────────────────────────────────────────────────────────────
-- PASO 3: Backfill app_metadata.tenant_id para usuarios con NULL
--
-- Esto actualiza el app_metadata via auth.users directamente.
-- Solo aplica a usuarios donde app_metadata->>'tenant_id' sea NULL
-- y exista exactamente 1 fila en tenant_users.
--
-- NOTA: Ejecutar manualmente solo si hay usuarios afectados (ver
--       diagnóstico abajo). Usar service_role. No ejecutar masivamente
--       si los usuarios tienen múltiples tenants sin saber cuál es el activo.
-- ─────────────────────────────────────────────────────────────────

-- Verificar usuarios afectados (solo lectura, seguro ejecutar siempre):
SELECT
  u.id                                            AS user_id,
  u.email,
  u.raw_app_meta_data ->> 'tenant_id'             AS jwt_tenant_id,
  COUNT(tu.tenant_id)                             AS tenant_count,
  array_agg(tu.tenant_id ORDER BY tu.created_at)  AS tenant_ids
FROM auth.users u
LEFT JOIN public.tenant_users tu ON tu.user_id = u.id
GROUP BY u.id, u.email, u.raw_app_meta_data
HAVING
  (u.raw_app_meta_data ->> 'tenant_id') IS NULL
  OR COUNT(tu.tenant_id) > 1
ORDER BY u.email;


-- Backfill: actualizar app_metadata para usuarios con NULL tenant_id
-- que pertenecen a exactamente 1 tenant (sin ambigüedad).
-- Descomentar y ejecutar como service_role en Supabase SQL Editor:
--
-- UPDATE auth.users u
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
--   || jsonb_build_object('tenant_id', tu.tenant_id::text)
-- FROM (
--   SELECT user_id, tenant_id
--   FROM public.tenant_users
--   WHERE user_id IN (
--     SELECT id FROM auth.users
--     WHERE raw_app_meta_data ->> 'tenant_id' IS NULL
--   )
--   GROUP BY user_id, tenant_id
--   HAVING COUNT(*) = 1  -- solo si pertenece a un único tenant
-- ) tu
-- WHERE u.id = tu.user_id;


-- ─────────────────────────────────────────────────────────────────
-- PASO 4: Diagnóstico general post-aplicación
-- ─────────────────────────────────────────────────────────────────

-- Verificar que la función devuelve el valor correcto del JWT:
-- SELECT public.get_current_tenant_id();  -- debe devolver tu tenant_id

-- Verificar usuarios con doble membresía:
-- SELECT user_id, array_agg(tenant_id) FROM public.tenant_users
-- GROUP BY user_id HAVING COUNT(*) > 1;

-- Verificar que todos los usuarios autenticados tienen app_metadata.tenant_id:
-- SELECT id, email, raw_app_meta_data ->> 'tenant_id' AS tenant_id
-- FROM auth.users
-- WHERE raw_app_meta_data ->> 'tenant_id' IS NULL
--   AND deleted_at IS NULL;
