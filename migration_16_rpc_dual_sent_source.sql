-- ==============================================================================
-- Migration 16: RPC unificada con fuente de verdad dual para estado de envío
--
-- Problema previo:
--   La RPC obtenía el estado de envío SOLO desde `envios_correo`.
--   Si `envios_correo` no tenía el registro (por fallo en sincronización del worker),
--   el participante volvía a aparecer como elegible aunque ya tuviera el certificado.
--
-- Solución:
--   Combinar `envios_correo` (fuente UI histórica) CON `certificate_jobs`
--   (fuente del motor nativo) usando OR lógico:
--     → ya enviado si envios_correo.estado='enviado' OR
--                    certificate_jobs (evento_id, participante_id) con status='sent' y email_sent=true
--
-- Comportamiento de accion_boton:
--   NULL       → ya enviado exitosamente (bloquear envío automático)
--   'enviar'   → nunca enviado, cumple criterios (elegible para lote automático)
--   'reenviar' → fallo previo (solo mediante reenvío manual por el admin)
--
-- Impacto:
--   - Ningún participante que ya recibió el certificado vuelve a recibirlo en lotes.
--   - Los administradores pueden usar Reenvío Manual para forzarlo.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.obtener_estado_certificados_evento(p_evento_id uuid DEFAULT NULL)
RETURNS TABLE (
    v_evento_id         uuid,
    inscripcion_id      uuid,
    persona_id          uuid,
    nombre_completo     text,
    numero_documento    text,
    correo_verificado   boolean,
    cumple_asistencia   boolean,
    autorizado_manual   boolean,
    enviado             boolean,
    estado_visual       text,
    accion_boton        text,
    evento_titulo       text,
    total_sesiones      bigint,
    asistencias_validas bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH event_sessions AS (
        SELECT
            e.id   AS ev_id,
            COUNT(s.id) AS total_s
        FROM public.eventos e
        LEFT JOIN public.sesiones_evento s ON s.evento_id = e.id
        GROUP BY e.id
    ),
    inscritos AS (
        SELECT
            i.id          AS v_inscripcion_id,
            i.persona_id  AS v_persona_id,
            i.evento_id   AS v_ev_id,
            p.nombre_completo,
            p.numero_documento,
            p.correo_verificado,
            e.titulo      AS ev_titulo,
            COALESCE(e.min_sesiones_certificado, 0) AS min_sesiones_certificado,
            COALESCE(es.total_s, 0)                 AS total_sesiones
        FROM public.inscripciones i
        JOIN public.personas   p  ON i.persona_id = p.id
        JOIN public.eventos    e  ON i.evento_id  = e.id
        LEFT JOIN event_sessions es ON es.ev_id   = e.id
        WHERE (p_evento_id IS NULL OR i.evento_id = p_evento_id)
    ),
    asistencias_count AS (
        SELECT
            a.persona_id,
            a.evento_id,
            COUNT(DISTINCT a.sesion_evento_id) AS total_asistencias
        FROM public.asistencias a
        WHERE (p_evento_id IS NULL OR a.evento_id = p_evento_id)
        GROUP BY a.persona_id, a.evento_id
    ),
    habilitaciones AS (
        SELECT h.persona_id, h.evento_id, true AS habilitado
        FROM public.habilitaciones_certificado h
        WHERE (p_evento_id IS NULL OR h.evento_id = p_evento_id)
    ),
    -- Fuente 1: tabla legada de UI
    envios_legacy AS (
        SELECT
            ec.persona_id,
            ec.inscripcion_id,
            ec.evento_id,
            bool_or(ec.estado = 'enviado') AS fue_enviado_legacy,
            bool_or(ec.estado = 'fallido') AS hubo_fallo_legacy
        FROM public.envios_correo ec
        WHERE (p_evento_id IS NULL OR ec.evento_id = p_evento_id)
        GROUP BY ec.persona_id, ec.inscripcion_id, ec.evento_id
    ),
    -- Fuente 2: motor nativo de certificados (fuente de verdad principal)
    envios_native AS (
        SELECT
            cj.participante_id AS persona_id,
            cj.evento_id,
            bool_or(cj.status = 'sent' AND cj.email_sent = true) AS fue_enviado_native,
            bool_or(cj.status = 'failed')                         AS hubo_fallo_native
        FROM public.certificate_jobs cj
        WHERE (p_evento_id IS NULL OR cj.evento_id = p_evento_id)
        GROUP BY cj.participante_id, cj.evento_id
    )
    SELECT
        ins.v_ev_id,
        ins.v_inscripcion_id,
        ins.v_persona_id,
        ins.nombre_completo,
        ins.numero_documento,
        ins.correo_verificado,
        -- ¿Cumple asistencia mínima?
        COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado AS cumple_asistencia,
        -- ¿Habilitado manualmente?
        COALESCE(hab.habilitado, false)                                   AS autorizado_manual,
        -- ¿Ya enviado? (cualquiera de las dos fuentes es suficiente)
        (
            COALESCE(env_l.fue_enviado_legacy, false) OR
            COALESCE(env_n.fue_enviado_native, false)
        )                                                                  AS enviado,
        -- Estado visual en la tabla de participantes
        CASE
            WHEN COALESCE(env_l.fue_enviado_legacy, false) OR COALESCE(env_n.fue_enviado_native, false)
                THEN 'Enviado'
            WHEN COALESCE(hab.habilitado, false) OR
                 (COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado)
                THEN 'Autorizado'
            ELSE 'No enviado'
        END                                                                AS estado_visual,
        -- Acción disponible en la UI
        -- NULL     → ya enviado (no mostrar botón automático; admin puede forzar Reenviar)
        -- 'enviar' → nunca enviado, elegible para lote automático
        -- 'reenviar' → fallo previo, solo manual
        CASE
            WHEN COALESCE(env_l.fue_enviado_legacy, false) OR COALESCE(env_n.fue_enviado_native, false)
                THEN NULL  -- Excluido de lotes automáticos
            WHEN COALESCE(env_l.hubo_fallo_legacy, false) OR COALESCE(env_n.hubo_fallo_native, false)
                THEN 'reenviar'
            WHEN (COALESCE(ac.total_asistencias, 0) >= ins.min_sesiones_certificado)
              OR COALESCE(hab.habilitado, false)
                THEN 'enviar'
            ELSE NULL
        END                                                                AS accion_boton,
        ins.ev_titulo,
        ins.total_sesiones,
        COALESCE(ac.total_asistencias, 0)::bigint                         AS asistencias_validas
    FROM inscritos ins
    LEFT JOIN asistencias_count ac  ON (ins.v_persona_id = ac.persona_id  AND ins.v_ev_id = ac.evento_id)
    LEFT JOIN habilitaciones    hab ON (ins.v_persona_id = hab.persona_id  AND ins.v_ev_id = hab.evento_id)
    LEFT JOIN envios_legacy     env_l ON (
        ins.v_persona_id    = env_l.persona_id       AND
        ins.v_inscripcion_id = env_l.inscripcion_id  AND
        ins.v_ev_id         = env_l.evento_id
    )
    LEFT JOIN envios_native     env_n ON (
        ins.v_persona_id = env_n.persona_id AND
        ins.v_ev_id      = env_n.evento_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.obtener_estado_certificados_evento(uuid) IS
'Fuente de verdad dual: combina envios_correo (legada) y certificate_jobs (motor nativo).
Un participante se considera "ya enviado" si cualquiera de las dos fuentes lo confirma.
accion_boton=NULL bloquea el envío automático. Reenvío manual sigue disponible desde la UI.';
