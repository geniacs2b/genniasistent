-- MASTER SQL SCRIPT: RPCs for Platform Refinement
-- This script corrects, standardizes, and creates all necessary functions for the platform.

-----------------------------------------------------------------------------------------
-- 1. CERTIFICATE TEMPLATES (PLANTILLAS)
-----------------------------------------------------------------------------------------

-- Guardar campos de plantilla (Corregido para manejar asociación por evento y plantilla)
CREATE OR REPLACE FUNCTION public.guardar_campo_plantilla_evento(
    p_evento_id uuid,
    p_tipo_campo text,
    p_etiqueta text,
    p_posicion_x numeric,
    p_posicion_y numeric,
    p_ancho_caja numeric,
    p_alto_caja numeric,
    p_text_align text,
    p_font_size integer DEFAULT 24,
    p_visible boolean DEFAULT true,
    p_orden integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plantilla_id uuid;
    v_campo_id uuid;
BEGIN
    -- 1. Obtener la plantilla asociada al evento
    SELECT plantilla_certificado_id INTO v_plantilla_id
    FROM public.eventos
    WHERE id = p_evento_id;

    IF v_plantilla_id IS NULL THEN
        RAISE EXCEPTION 'El evento no tiene una plantilla de certificado asociada.';
    END IF;

    -- 2. Upsert del campo (basado en plantilla y tipo de campo)
    INSERT INTO public.plantilla_campos_certificado (
        plantilla_certificado_id,
        tipo_campo,
        etiqueta,
        pos_x,
        pos_y,
        width,
        height,
        text_align,
        font_size,
        visible,
        orden,
        font_family,
        font_weight,
        color,
        line_height,
        letter_spacing
    )
    VALUES (
        v_plantilla_id,
        p_tipo_campo,
        p_etiqueta,
        p_posicion_x,
        p_posicion_y,
        p_ancho_caja,
        p_alto_caja,
        p_text_align,
        p_font_size,
        p_visible,
        p_orden,
        'Arial', -- Defaults for required fields not in editor
        'normal',
        '#000000',
        1.2,
        0
    )
    ON CONFLICT (plantilla_certificado_id, tipo_campo) DO UPDATE
    SET 
        etiqueta = EXCLUDED.etiqueta,
        pos_x = EXCLUDED.pos_x,
        pos_y = EXCLUDED.pos_y,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        text_align = EXCLUDED.text_align,
        font_size = EXCLUDED.font_size,
        visible = EXCLUDED.visible,
        orden = EXCLUDED.orden,
        updated_at = now()
    RETURNING id INTO v_campo_id;

    RETURN v_campo_id;
END;
$$;

-- Obtener detalle completo de plantilla (incluyendo campos)
CREATE OR REPLACE FUNCTION public.obtener_plantilla_detalle(p_plantilla_id uuid)
RETURNS TABLE (
    id uuid,
    nombre text,
    descripcion text,
    archivo_base_url text,
    ancho_px integer,
    alto_px integer,
    campos jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.archivo_base_url,
        p.ancho_px,
        p.alto_px,
        COALESCE(
            (SELECT jsonb_agg(c ORDER BY c.orden)
             FROM public.plantilla_campos_certificado c
             WHERE c.plantilla_certificado_id = p.id),
            '[]'::jsonb
        ) as campos
    FROM public.plantillas_certificado p
    WHERE p.id = p_plantilla_id;
END;
$$;

-- Eliminar plantilla y limpiar referencias
CREATE OR REPLACE FUNCTION public.eliminar_plantilla_certificado(p_plantilla_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Limpiar referencia en eventos
    UPDATE public.eventos SET plantilla_certificado_id = NULL WHERE plantilla_certificado_id = p_plantilla_id;
    
    -- 2. Eliminar campos
    DELETE FROM public.plantilla_campos_certificado WHERE plantilla_certificado_id = p_plantilla_id;
    
    -- 3. Eliminar plantilla
    DELETE FROM public.plantillas_certificado WHERE id = p_plantilla_id;
    
    RETURN true;
END;
$$;

-----------------------------------------------------------------------------------------
-- 2. SESSIONS (SESIONES)
-----------------------------------------------------------------------------------------

-- Eliminar sesión (con validación de asistencias)
CREATE OR REPLACE FUNCTION public.eliminar_sesion_evento(p_sesion_evento_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Validar si hay asistencias
    IF EXISTS (SELECT 1 FROM public.asistencias WHERE sesion_id = p_sesion_evento_id) THEN
        RAISE EXCEPTION 'No se puede eliminar la sesión porque ya tiene asistencias registradas.';
    END IF;

    -- 2. Eliminar QR asociados
    DELETE FROM public.qr_tokens_asistencia WHERE sesion_id = p_sesion_evento_id;

    -- 3. Eliminar sesión
    DELETE FROM public.sesiones_evento WHERE id = p_sesion_evento_id;

    RETURN true;
END;
$$;

-----------------------------------------------------------------------------------------
-- 3. MAJOR DELETIONS (EVENTOS)
-----------------------------------------------------------------------------------------

-- Eliminar evento completo cascada manual
CREATE OR REPLACE FUNCTION public.eliminar_evento_completo(p_evento_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_form_id uuid;
    v_plantilla_id uuid;
BEGIN
    -- 1. Obtener IDs relacionados
    SELECT id INTO v_form_id FROM public.formularios WHERE evento_id = p_evento_id;
    SELECT plantilla_certificado_id INTO v_plantilla_id FROM public.eventos WHERE id = p_evento_id;

    -- 2. Eliminar Asistencias y QR (vía sesiones)
    DELETE FROM public.asistencias WHERE evento_id = p_evento_id;
    DELETE FROM public.qr_tokens_asistencia WHERE sesion_id IN (SELECT id FROM public.sesiones_evento WHERE evento_id = p_evento_id);
    DELETE FROM public.sesiones_evento WHERE evento_id = p_evento_id;

    -- 3. Eliminar Inscripciones y Respuestas
    IF v_form_id IS NOT NULL THEN
        DELETE FROM public.respuestas_formulario WHERE formulario_id = v_form_id;
    END IF;
    DELETE FROM public.verificaciones_correo WHERE inscripcion_id IN (SELECT id FROM public.inscripciones WHERE evento_id = p_evento_id);
    DELETE FROM public.inscripciones WHERE evento_id = p_evento_id;
    
    -- 4. Eliminar Formulario
    DELETE FROM public.formulario_campos WHERE formulario_id = v_form_id;
    DELETE FROM public.formularios WHERE evento_id = p_evento_id;

    -- 5. Eliminar Evento
    DELETE FROM public.eventos WHERE id = p_evento_id;

    RETURN true;
END;
$$;

-----------------------------------------------------------------------------------------
-- 4. QR & ATTENDANCE (ASISTENCIA)
-----------------------------------------------------------------------------------------

-- Validar QR Asistencia (Retorna datos del evento/sesión)
CREATE OR REPLACE FUNCTION public.validar_qr_asistencia(p_token text)
RETURNS TABLE (
    token_id uuid,
    sesion_id uuid,
    sesion_nombre text,
    evento_id uuid,
    evento_titulo text,
    token_activo boolean,
    estado_qr text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as token_id,
        s.id as sesion_id,
        s.nombre as sesion_nombre,
        e.id as evento_id,
        e.titulo as evento_titulo,
        q.activo as token_activo,
        q.estado as estado_qr
    FROM public.qr_tokens_asistencia q
    JOIN public.sesiones_evento s ON q.sesion_id = s.id
    JOIN public.eventos e ON s.evento_id = e.id
    WHERE q.token = p_token;
END;
$$;

-- Registrar asistencia por QR y Documento (VERSIÓN DEFINITIVA OK/MENSAJE)
CREATE OR REPLACE FUNCTION public.registrar_asistencia_por_qr(
    p_token text,
    p_numero_documento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_id uuid;
    v_sesion_id uuid;
    v_evento_id uuid;
    v_persona_id uuid;
    v_asistencia_id uuid;
    v_inscripcion_id uuid;
BEGIN
    -- 1. Validar Token (sesion_evento_id)
    SELECT id, sesion_evento_id, evento_id INTO v_token_id, v_sesion_id, v_evento_id
    FROM public.qr_tokens_asistencia 
    WHERE token = p_token AND activo = true;

    IF v_token_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'Este código QR no está disponible o ya no se encuentra activo.',
            'error_type', 'INVALID_TOKEN'
        );
    END IF;

    -- 2. Buscar Persona
    SELECT id INTO v_persona_id FROM public.personas WHERE numero_documento = p_numero_documento;
    
    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'La cédula ingresada no se encuentra registrada.',
            'error_type', 'PERSON_NOT_FOUND'
        );
    END IF;

    -- 3. Buscar Inscripción
    SELECT id INTO v_inscripcion_id 
    FROM public.inscripciones 
    WHERE evento_id = v_evento_id AND persona_id = v_persona_id;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'Esta persona no está inscrita en este evento.',
            'error_type', 'NOT_REGISTERED_FOR_EVENT'
        );
    END IF;

    -- 4. Verificar duplicidad (sesion_evento_id)
    IF EXISTS (
        SELECT 1 FROM public.asistencias 
        WHERE sesion_evento_id = v_sesion_id AND persona_id = v_persona_id
    ) THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'Esta persona ya registró asistencia en esta sección y no puede volver a registrarla.', 
            'already_registered', true
        );
    END IF;

    -- 5. Insertar Asistencia (sesion_evento_id, fecha_hora_registro)
    INSERT INTO public.asistencias (
        evento_id, 
        sesion_evento_id, 
        persona_id, 
        inscripcion_id,
        qr_token_id, 
        numero_documento_digitado,
        metodo_registro,
        fecha_hora_registro,
        valido
    )
    VALUES (
        v_evento_id, 
        v_sesion_id, 
        v_persona_id, 
        v_inscripcion_id,
        v_token_id, 
        p_numero_documento,
        'QR_PUBLIC',
        now(),
        true
    )
    RETURNING id INTO v_asistencia_id;

    RETURN jsonb_build_object(
        'ok', true, 
        'mensaje', '¡Asistencia registrada exitosamente!',
        'asistencia_id', v_asistencia_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'ok', false,
        'mensaje', 'Error inesperado: ' || SQLERRM
    );
END;
$$;
