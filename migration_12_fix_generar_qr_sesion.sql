-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 12 — Corregir generar_qr_sesion (y funciones auxiliares de QR)
--
-- Problema: la versión desplegada en producción de generar_qr_sesion
--   1. No tenía SECURITY DEFINER → corría como el usuario autenticado (sujeto a RLS)
--   2. No incluía tenant_id en el INSERT → RLS "WITH CHECK (tenant_id = ...)" rechazaba
--      la fila → error: "new row violates row-level security policy"
--
-- Solución:
--   • Cada función usa SECURITY DEFINER (corre como postgres → bypasa RLS)
--   • generar_qr_sesion resuelve tenant_id desde sesiones_evento → eventos
--   • tenant_id se propaga explícitamente al INSERT en qr_tokens_asistencia
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════
-- 1.  generar_qr_sesion
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.generar_qr_sesion(
    p_sesion_evento_id uuid,
    p_observacion      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER                   -- bypasa RLS; corre como postgres
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_evento_id uuid;
    v_token     text;
    v_qr_id     uuid;
BEGIN
    -- 0. Resolver evento y tenant desde la sesión
    SELECT s.evento_id, e.tenant_id
    INTO   v_evento_id, v_tenant_id
    FROM   public.sesiones_evento s
    JOIN   public.eventos          e ON e.id = s.evento_id
    WHERE  s.id = p_sesion_evento_id;

    IF v_evento_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Sesión no encontrada.');
    END IF;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'No se pudo resolver el tenant del evento. Verifica que el evento tenga tenant_id asignado.');
    END IF;

    RAISE LOG '[generar_qr_sesion] sesion=% evento=% tenant=%',
              p_sesion_evento_id, v_evento_id, v_tenant_id;

    -- 1. Verificar que no haya un QR activo o generado
    IF EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE sesion_evento_id = p_sesion_evento_id
          AND estado IN ('activo', 'generado', 'inactivo')
    ) THEN
        RETURN jsonb_build_object(
            'ok', false,
            'mensaje', 'Ya existe un QR para esta sesión. Cancela o elimina el anterior primero.'
        );
    END IF;

    -- 2. Generar token único
    v_token := encode(
        digest(p_sesion_evento_id::text || now()::text || random()::text, 'sha256'),
        'hex'
    );

    -- 3. Insertar con tenant_id explícito
    INSERT INTO public.qr_tokens_asistencia (
        sesion_evento_id,
        evento_id,
        token,
        estado,
        activo,
        observacion,
        tenant_id          -- ← obligatorio para RLS
    )
    VALUES (
        p_sesion_evento_id,
        v_evento_id,
        v_token,
        'generado',
        false,
        p_observacion,
        v_tenant_id        -- ← derivado de sesion → evento
    )
    RETURNING id INTO v_qr_id;

    RAISE LOG '[generar_qr_sesion] OK qr_id=%', v_qr_id;

    RETURN jsonb_build_object(
        'ok',      true,
        'mensaje', 'QR generado correctamente. Actívalo cuando empiece la sesión.',
        'qr_id',   v_qr_id,
        'token',   v_token
    );

EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[generar_qr_sesion] ERROR % %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object('ok', false, 'mensaje', 'Error inesperado: ' || SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 2.  activar_qr_sesion
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.activar_qr_sesion(
    p_qr_token_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE id = p_qr_token_id AND estado = 'generado'
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El QR no está en estado generado o no existe.');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo           = true,
        estado           = 'activo',
        fecha_activacion = now()
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR activado correctamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 3.  desactivar_qr_sesion
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.desactivar_qr_sesion(
    p_qr_token_id    uuid,
    p_desactivado_por text DEFAULT NULL,
    p_observacion    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE id = p_qr_token_id AND estado = 'activo'
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El QR no está activo o no existe.');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo              = false,
        estado              = 'cerrado',
        desactivado_por     = p_desactivado_por,
        observacion         = COALESCE(p_observacion, observacion),
        fecha_desactivacion = now()
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR desactivado correctamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 4.  cancelar_qr_sesion
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cancelar_qr_sesion(
    p_qr_token_id uuid,
    p_observacion text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE id = p_qr_token_id
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'QR no encontrado.');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo              = false,
        estado              = 'cancelado',
        observacion         = COALESCE(p_observacion, observacion),
        fecha_desactivacion = now()
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR cancelado correctamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 5.  eliminar_qr_sesion
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.eliminar_qr_sesion(
    p_qr_token_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE id = p_qr_token_id
          AND estado IN ('cancelado', 'cerrado')
    ) THEN
        RETURN jsonb_build_object(
            'ok', false,
            'mensaje', 'Solo se pueden eliminar QRs cancelados o cerrados.'
        );
    END IF;

    DELETE FROM public.qr_tokens_asistencia WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR eliminado permanentemente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 6.  Backfill: asignar tenant_id a qr_tokens existentes sin él
-- ═══════════════════════════════════════════════════════════════════
UPDATE public.qr_tokens_asistencia q
SET tenant_id = s.tenant_id
FROM public.sesiones_evento s
WHERE (q.sesion_evento_id = s.id OR q.sesion_id = s.id)
  AND q.tenant_id IS NULL
  AND s.tenant_id IS NOT NULL;
