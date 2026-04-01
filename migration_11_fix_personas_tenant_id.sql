-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 11 — Backfill tenant_id en personas y corregir RPC de inscripción
--
-- Problema: registrar_inscripcion_evento no asignaba tenant_id al crear/actualizar
-- personas. Eso dejó todas las personas con tenant_id = NULL. La política RLS de
-- personas filtraba esas filas → el join desde inscripciones devolvía null.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Backfill: asignar tenant_id a personas que aún no lo tienen,
--    derivándolo de su inscripción más reciente.
UPDATE public.personas p
SET tenant_id = (
    SELECT i.tenant_id
    FROM public.inscripciones i
    WHERE i.persona_id = p.id
      AND i.tenant_id IS NOT NULL
    ORDER BY i.created_at DESC
    LIMIT 1
)
WHERE p.tenant_id IS NULL;

-- 2. Actualizar RPC registrar_inscripcion_evento para asignar tenant_id a personas.
--    Requiere obtener el tenant_id del evento al que se inscribe.
CREATE OR REPLACE FUNCTION public.registrar_inscripcion_evento(
    p_formulario_id uuid,
    p_evento_id uuid,
    p_tipo_documento text,
    p_numero_documento text,
    p_nombres text,
    p_apellidos text,
    p_correo text,
    p_telefono text,
    p_empresa text,
    p_cargo text,
    p_municipio text,
    p_departamento text,
    p_tratamiento_datos_aceptado boolean,
    p_respuesta_json jsonb,
    p_fuente text,
    p_minutos_expiracion integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_token_verificacion text;
    v_resultado jsonb;
    v_tenant_id uuid;
BEGIN
    -- Obtener tenant_id del evento
    SELECT tenant_id INTO v_tenant_id
    FROM public.eventos
    WHERE id = p_evento_id;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado o sin tenant');
    END IF;

    -- 1. Insertar o actualizar persona (Upsert por correo)
    INSERT INTO public.personas (
        tipo_documento,
        numero_documento,
        correo,
        nombres,
        apellidos,
        telefono,
        empresa,
        cargo,
        municipio,
        departamento,
        tenant_id
    )
    VALUES (
        p_tipo_documento,
        p_numero_documento,
        LOWER(TRIM(p_correo)),
        p_nombres,
        p_apellidos,
        p_telefono,
        p_empresa,
        p_cargo,
        p_municipio,
        p_departamento,
        v_tenant_id
    )
    ON CONFLICT (correo) DO UPDATE
    SET
        tipo_documento = EXCLUDED.tipo_documento,
        numero_documento = EXCLUDED.numero_documento,
        nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos,
        tenant_id = COALESCE(public.personas.tenant_id, EXCLUDED.tenant_id)
    RETURNING id INTO v_persona_id;

    -- 2. Crear o actualizar Inscripción
    INSERT INTO public.inscripciones (
        evento_id,
        persona_id,
        estado,
        fuente,
        tratamiento_datos_aceptado,
        tenant_id
    )
    VALUES (
        p_evento_id,
        v_persona_id,
        'pendiente_verificacion',
        p_fuente,
        p_tratamiento_datos_aceptado,
        v_tenant_id
    )
    ON CONFLICT (evento_id, persona_id) DO UPDATE
    SET
        estado = 'pendiente_verificacion',
        updated_at = now()
    RETURNING id INTO v_inscripcion_id;

    -- 3. Guardar Respuestas del Formulario
    INSERT INTO public.respuestas_formulario (
        formulario_id,
        inscripcion_id,
        respuestas
    )
    VALUES (
        p_formulario_id,
        v_inscripcion_id,
        p_respuesta_json
    )
    ON CONFLICT (formulario_id, inscripcion_id) DO UPDATE
    SET respuestas = EXCLUDED.respuestas;

    -- 4. Generar Token de Verificación
    v_token_verificacion := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'),
        'hex'
    );

    INSERT INTO public.verificaciones_correo (
        inscripcion_id,
        token,
        expira_at
    )
    VALUES (
        v_inscripcion_id,
        v_token_verificacion,
        now() + (p_minutos_expiracion || ' minutes')::interval
    );

    v_resultado := jsonb_build_object(
        'success', true,
        'inscripcion_id', v_inscripcion_id,
        'token_verificacion', v_token_verificacion
    );

    RETURN v_resultado;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
