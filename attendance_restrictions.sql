-- 1. Crear restricción única en la tabla asistencias
-- Esta restricción garantiza que una persona solo pueda registrar una asistencia por cada sesión del evento.
ALTER TABLE public.asistencias
DROP CONSTRAINT IF EXISTS unique_persona_sesion;

ALTER TABLE public.asistencias
ADD CONSTRAINT unique_persona_sesion UNIQUE (persona_id, sesion_id);

-- 2. Ajustar la función de registro de asistencia
-- Se valida si ya existe la asistencia para devolver un mensaje amigable.
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
BEGIN
    -- 1. Validar Token
    SELECT id, sesion_id INTO v_token_id, v_sesion_id
    FROM public.qr_tokens_asistencia 
    WHERE token = p_token AND activo = true;

    IF v_token_id IS NULL THEN
        RAISE EXCEPTION 'Token de QR no válido o inactivo.';
    END IF;

    -- 2. Obtener Evento ID real
    SELECT evento_id INTO v_evento_id FROM public.sesiones_evento WHERE id = v_sesion_id;

    -- 3. Buscar Persona
    SELECT id INTO v_persona_id FROM public.personas WHERE numero_documento = p_numero_documento;
    
    IF v_persona_id IS NULL THEN
        RAISE EXCEPTION 'Persona no encontrada. Debe registrarse primero al evento.';
    END IF;

    -- 4. Verificar si ya tiene asistencia en esta sesión
    -- Aunque la restricción UNIQUE previene el duplicado a nivel DB, 
    -- esta validación permite devolver un mensaje controlado a la UI.
    IF EXISTS (
        SELECT 1 FROM public.asistencias 
        WHERE sesion_id = v_sesion_id AND persona_id = v_persona_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Asistencia ya registrada anteriormente en esta sesión.', 
            'already_registered', true
        );
    END IF;

    -- 5. Insertar Asistencia
    INSERT INTO public.asistencias (evento_id, sesion_id, persona_id, qr_token_id, fecha_hora)
    VALUES (v_evento_id, v_sesion_id, v_persona_id, v_token_id, now())
    RETURNING id INTO v_asistencia_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Asistencia registrada exitosamente.',
        'asistencia_id', v_asistencia_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;
