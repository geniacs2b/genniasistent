RETURN jsonb_build_object('success', true, 'message', 'Asistencia registrada exitosamente.', 'asistencia_id', v_asistencia_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 6. FUNCIÓN: cancelar_registro_pendiente
-- Elimina la inscripción y datos relacionados si aún no está verificada.
-- Si la persona no tiene más inscripciones, también elimina a la persona.
CREATE OR REPLACE FUNCTION public.cancelar_registro_pendiente(
    p_numero_documento text,
    p_tipo_documento text,
    p_evento_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_inscrito boolean;
BEGIN
    -- 1. Buscar Persona e Inscripción
    SELECT p.id, i.id, (i.estado = 'inscrito')
    INTO v_persona_id, v_inscripcion_id, v_inscrito
    FROM public.personas p
    JOIN public.inscripciones i ON i.persona_id = p.id
    WHERE p.numero_documento = p_numero_documento 
      AND p.tipo_documento = p_tipo_documento
      AND i.evento_id = p_evento_id;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró una inscripción pendiente para este documento.');
    END IF;

    -- 2. No permitir cancelar si ya está verificado (seguridad)
    IF v_inscrito THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se puede cancelar una inscripción que ya ha sido verificada.');
    END IF;

    -- 3. Eliminar datos en orden
    DELETE FROM public.respuestas_formulario WHERE inscripcion_id = v_inscripcion_id;
    DELETE FROM public.verificaciones_correo WHERE inscripcion_id = v_inscripcion_id;
    DELETE FROM public.inscripciones WHERE id = v_inscripcion_id;

    -- 4. ¿Eliminar Persona? (Solo si no tiene más inscripciones)
    IF NOT EXISTS (SELECT 1 FROM public.inscripciones WHERE persona_id = v_persona_id) THEN
        DELETE FROM public.personas WHERE id = v_persona_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Inscripción cancelada y datos eliminados correctamente.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
