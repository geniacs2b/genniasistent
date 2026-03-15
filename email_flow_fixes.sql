-- RPCs para el flujo de verificación de correo mejorado (Versión Experta alineada con Schema)

-- 1. Verificar correo e inscribir definitivamente
CREATE OR REPLACE FUNCTION public.verificar_correo_inscripcion(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscripcion_id uuid;
    v_verificacion_id uuid;
    v_persona_id uuid;
    v_clean_token text;
BEGIN
    -- Limpiar el token de espacios accidentales
    v_clean_token := TRIM(p_token);

    -- Buscar el token válido usando los nombres de columna reales
    SELECT id, inscripcion_id, persona_id INTO v_verificacion_id, v_inscripcion_id, v_persona_id
    FROM public.verificaciones_correo
    WHERE token = v_clean_token 
      AND estado = 'pendiente' 
      AND fecha_expiracion > now();

    IF v_verificacion_id IS NULL THEN
        -- Casos de error con token limpio
        IF EXISTS (SELECT 1 FROM public.verificaciones_correo WHERE token = v_clean_token AND estado = 'verificado') THEN
            RETURN jsonb_build_object('ok', false, 'mensaje', 'Este enlace ya fue utilizado anteriormente.');
        END IF;
        
        IF EXISTS (SELECT 1 FROM public.verificaciones_correo WHERE token = v_clean_token AND fecha_expiracion <= now()) THEN
            -- Opcionalmente actualizar estado a 'expirado' aquí
            UPDATE public.verificaciones_correo SET estado = 'expirado' WHERE token = v_clean_token AND estado = 'pendiente';
            RETURN jsonb_build_object('ok', false, 'mensaje', 'El enlace de verificación ha expirado.');
        END IF;

        RETURN jsonb_build_object('ok', false, 'mensaje', 'Enlace de verificación inválido o corrupto.');
    END IF;

    -- Marcar como verificado y activar inscripción
    UPDATE public.verificaciones_correo 
    SET estado = 'verificado', 
        fecha_verificacion = now() 
    WHERE id = v_verificacion_id;

    UPDATE public.inscripciones 
    SET estado = 'inscrito', 
        updated_at = now() 
    WHERE id = v_inscripcion_id;

    UPDATE public.personas 
    SET correo_verificado = true,
        fecha_verificacion_correo = now(),
        updated_at = now()
    WHERE id = v_persona_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', '¡Correo verificado con éxito!');
END;
$$;

-- 2. Actualizar correo y generar nuevo token
CREATE OR REPLACE FUNCTION public.actualizar_correo_y_reenviar_verificacion(
    p_numero_documento text,
    p_tipo_documento text,
    p_nuevo_correo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_evento_id uuid;
    v_nuevo_token text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_correo_clean text;
BEGIN
    v_nuevo_correo_clean := LOWER(TRIM(p_nuevo_correo));

    -- Buscar Persona e inscripción pendiente más reciente
    SELECT p.id, i.id, i.evento_id, p.nombres, e.titulo 
    INTO v_persona_id, v_inscripcion_id, v_evento_id, v_nombres, v_evento_titulo
    FROM public.personas p
    JOIN public.inscripciones i ON i.persona_id = p.id
    JOIN public.eventos e ON i.evento_id = e.id
    WHERE p.numero_documento = p_numero_documento 
      AND p.tipo_documento = p_tipo_documento
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró registro con ese documento.');
    END IF;

    -- Actualizar correo en personas
    UPDATE public.personas 
    SET correo = v_nuevo_correo_clean, 
        correo_verificado = false,
        updated_at = now()
    WHERE id = v_persona_id;
    
    -- Invalidar tokens previos
    UPDATE public.verificaciones_correo 
    SET estado = 'invalidado' 
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    -- Generar nuevo token
    v_nuevo_token := encode(digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex');
    
    INSERT INTO public.verificaciones_correo (
        persona_id,
        evento_id,
        inscripcion_id,
        correo,
        token,
        estado,
        fecha_envio,
        fecha_expiracion
    )
    VALUES (
        v_persona_id,
        v_evento_id,
        v_inscripcion_id,
        v_nuevo_correo_clean,
        v_nuevo_token,
        'pendiente',
        now(),
        now() + interval '60 minutes'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'mensaje', 'Correo actualizado y nuevo token generado.',
        'token_verificacion', v_nuevo_token,
        'nombres', v_nombres,
        'evento_titulo', v_evento_titulo
    );
END;
$$;

-- 3. Reenviar verificación al correo actual
CREATE OR REPLACE FUNCTION public.reenviar_verificacion_inscripcion(
    p_numero_documento text,
    p_tipo_documento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_evento_id uuid;
    v_correo text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_token text;
BEGIN
    SELECT p.id, i.id, i.evento_id, p.correo, p.nombres, e.titulo 
    INTO v_persona_id, v_inscripcion_id, v_evento_id, v_correo, v_nombres, v_evento_titulo
    FROM public.personas p
    JOIN public.inscripciones i ON i.persona_id = p.id
    JOIN public.eventos e ON i.evento_id = e.id
    WHERE p.numero_documento = p_numero_documento AND p.tipo_documento = p_tipo_documento
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró registro para el documento ingresado.');
    END IF;

    -- Invalidar previos
    UPDATE public.verificaciones_correo 
    SET estado = 'invalidado' 
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    -- Nuevo token
    v_nuevo_token := encode(digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex');
    
    INSERT INTO public.verificaciones_correo (
        persona_id,
        evento_id,
        inscripcion_id,
        correo,
        token,
        estado,
        fecha_envio,
        fecha_expiracion
    )
    VALUES (
        v_persona_id,
        v_evento_id,
        v_inscripcion_id,
        v_correo,
        v_nuevo_token,
        'pendiente',
        now(),
        now() + interval '60 minutes'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'token_verificacion', v_nuevo_token,
        'correo', v_correo,
        'nombres', v_nombres,
        'evento_titulo', v_evento_titulo
    );
END;
$$;
