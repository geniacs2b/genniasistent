-- FUNCIÓN UNIFICADA DE ESTADO DE CERTIFICADOS
-- Proporciona una fuente de verdad única para la vista de inscritos
-- Incluye conteo de sesiones y asistencias para la nueva columna "SESIONES"

CREATE OR REPLACE FUNCTION public.obtener_estado_certificados_evento(p_evento_id uuid DEFAULT NULL)
RETURNS TABLE (
    v_evento_id uuid,
    inscripcion_id uuid,
    persona_id uuid,
    nombre_completo text,
    numero_documento text,
    correo_verificado boolean,
    cumple_asistencia boolean,
    autorizado_manual boolean,
    enviado boolean,
    estado_visual text,
    accion_boton text,
    evento_titulo text,
    total_sesiones bigint,
    asistencias_validas bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH event_sessions AS (
        SELECT 
            e.id as ev_id,
            COUNT(s.id) as total_s
        FROM public.eventos e
        LEFT JOIN public.sesiones_evento s ON s.evento_id = e.id
        GROUP BY e.id
    ),
    inscritos AS (
        SELECT 
            i.id as v_inscripcion_id,
            i.persona_id as v_persona_id,
            i.evento_id as v_ev_id,
            p.nombre_completo,
            p.numero_documento,
            p.correo_verificado,
            e.titulo as ev_titulo,
            COALESCE(e.min_sesiones_certificado, 0) as min_sesiones_certificado,
            COALESCE(es.total_s, 0) as total_sesiones
        FROM public.inscripciones i
        JOIN public.personas p ON i.persona_id = p.id
        JOIN public.eventos e ON i.evento_id = e.id
        LEFT JOIN event_sessions es ON es.ev_id = e.id
        WHERE (p_evento_id IS NULL OR i.evento_id = p_evento_id)
    ),
    asistencias_count AS (
        SELECT 
            a.persona_id, 
            a.evento_id,
            COUNT(DISTINCT a.sesion_evento_id) as total_asistencias
        FROM public.asistencias a
        WHERE (p_evento_id IS NULL OR a.evento_id = p_evento_id)
        GROUP BY a.persona_id, a.evento_id
    ),
    habilitaciones AS (
        SELECT h.persona_id, h.evento_id, true as habilitado
        FROM public.habilitaciones_certificado h
        WHERE (p_evento_id IS NULL OR h.evento_id = p_evento_id)
    ),
    envios AS (
        SELECT 
            ec.persona_id, 
            ec.inscripcion_id,
            ec.evento_id,
            bool_or(ec.estado = 'enviado') as fue_enviado,
            bool_or(ec.estado = 'fallido') as hubo_fallo
        FROM public.envios_correo ec
        WHERE (p_evento_id IS NULL OR ec.evento_id = p_evento_id)
        GROUP BY ec.persona_id, ec.inscripcion_id, ec.evento_id
    )
    SELECT 
        ins.v_ev_id,
        ins.v_inscripcion_id,
        ins.v_persona_id,
        ins.nombre_completo,
        ins.numero_documento,
        ins.correo_verificado,
        COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado,
        COALESCE(hab.habilitado, false),
        COALESCE(env.fue_enviado, false),
        CASE 
            WHEN COALESCE(env.fue_enviado, false) THEN 'Enviado'
            WHEN COALESCE(hab.habilitado, false) OR (COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado) THEN 'Autorizado'
            ELSE 'No enviado'
        END,
        CASE 
            WHEN COALESCE(env.fue_enviado, false) THEN NULL
            WHEN COALESCE(env.hubo_fallo, false) THEN 'reenviar'
            WHEN (COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado) OR COALESCE(hab.habilitado, false) THEN 'enviar'
            ELSE NULL
        END,
        ins.ev_titulo,
        ins.total_sesiones,
        COALESCE(ac.total_asistencias, 0)::bigint as asistencias_validas
    FROM inscritos ins
    LEFT JOIN asistencias_count ac ON (ins.v_persona_id = ac.persona_id AND ins.v_ev_id = ac.evento_id)
    LEFT JOIN habilitaciones hab ON (ins.v_persona_id = hab.persona_id AND ins.v_ev_id = hab.evento_id)
    LEFT JOIN envios env ON (ins.v_persona_id = env.persona_id AND ins.v_inscripcion_id = env.inscripcion_id AND ins.v_ev_id = env.evento_id);
END;
$$ LANGUAGE plpgsql;