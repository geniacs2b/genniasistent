-- RPC PARA ACTIVAR QR CON RESTRICCIONES DE FECHA Y HORA
-- Garantiza que el QR solo se active el día de la sesión y dentro del horario programado.

CREATE OR REPLACE FUNCTION public.activar_qr_sesion(p_qr_token_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion_id uuid;
    v_fecha date;
    v_hora_inicio time;
    v_hora_fin time;
    v_ahora_bogota timestamp;
    v_fecha_hoy date;
    v_hora_actual time;
BEGIN
    -- 1. Obtener datos de la sesión asociada al QR
    SELECT 
        s.id, s.fecha, s.hora_inicio, s.hora_fin 
    INTO 
        v_sesion_id, v_fecha, v_hora_inicio, v_hora_fin
    FROM 
        public.qr_tokens_asistencia q
    JOIN 
        public.sesiones_evento s ON q.sesion_evento_id = s.id
    WHERE 
        q.id = p_qr_token_id;

    IF v_sesion_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Código QR no encontrado.');
    END IF;

    -- 2. Calcular tiempo actual en Bogotá
    v_ahora_bogota := now() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    v_fecha_hoy := v_ahora_bogota::date;
    v_hora_actual := v_ahora_bogota::time;

    -- 3. Validar Fecha
    IF v_fecha_hoy != v_fecha THEN
        IF v_fecha_hoy < v_fecha THEN
            RETURN jsonb_build_object(
                'ok', false, 
                'mensaje', 'Este código QR sólo puede activarse el día de la sesión (' || to_char(v_fecha, 'DD/MM/YYYY') || ').'
            );
        ELSE
            RETURN jsonb_build_object(
                'ok', false, 
                'mensaje', 'La fecha programada para esta sesión ya ha pasado.'
            );
        END IF;
    END IF;

    -- 4. Validar Horario
    IF v_hora_actual < v_hora_inicio THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'Aún no es la hora de inicio de la sesión. Podrás activarlo a las ' || to_char(v_hora_inicio, 'HH12:MI AM') || '.'
        );
    END IF;

    IF v_hora_actual > v_hora_fin THEN
        RETURN jsonb_build_object(
            'ok', false, 
            'mensaje', 'El horario de esta sesión ha finalizado (' || to_char(v_hora_fin, 'HH12:MI AM') || ').'
        );
    END IF;

    -- 5. Activar el Token
    UPDATE public.qr_tokens_asistencia
    SET 
        activo = true,
        estado = 'activo',
        fecha_activacion = now(),
        fecha_desactivacion = NULL
    WHERE 
        id = p_qr_token_id;

    RETURN jsonb_build_object(
        'ok', true, 
        'mensaje', 'Código QR activado exitosamente para la sesión.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', 'Error inesperado: ' || SQLERRM);
END;
$$;
