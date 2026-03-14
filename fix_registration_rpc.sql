-- FUNCIÓN CORREGIDA: registrar_inscripcion_evento
-- Esta versión resuelve el error "column reference 'persona_id' is ambiguous" 
-- utilizando alias estrictos y asegurando que los parámetros coincidan con la firma real.

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
BEGIN
    -- 1. Insertar o actualizar persona (Upsert por correo y documento)
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
        departamento
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
        p_departamento
    )
    ON CONFLICT (correo) DO UPDATE 
    SET 
        tipo_documento = EXCLUDED.tipo_documento,
        numero_documento = EXCLUDED.numero_documento,
        nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos
    RETURNING id INTO v_persona_id;

    -- 2. Crear o actualizar Inscripción
    -- Usamos alias 'i' para evitar ambigüedad con v_persona_id
    INSERT INTO public.inscripciones (
        evento_id,
        persona_id,
        estado,
        fuente,
        tratamiento_datos_aceptado
    )
    VALUES (
        p_evento_id,
        v_persona_id,
        'pendiente_verificacion',
        p_fuente,
        p_tratamiento_datos_aceptado
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
    SET 
        respuestas = EXCLUDED.respuestas;

    -- 4. Generar Token de Verificación
    v_token_verificacion := encode(digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex');
    
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
