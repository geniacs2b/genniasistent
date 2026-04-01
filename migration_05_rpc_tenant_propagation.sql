-- =================================================================
-- MIGRATION 05: Propagación explícita de tenant_id en todos los RPCs
-- Fecha: 2026-03-30
--
-- OBJETIVO: Eliminar dependencia de triggers. Cada RPC que inserte datos
-- ahora deriva tenant_id desde la tabla padre y lo propaga explícitamente.
--
-- PATRÓN GENERAL:
--   1. Obtener v_tenant_id con: SELECT tenant_id INTO v_tenant_id FROM eventos WHERE id = p_evento_id
--   2. Incluir tenant_id en TODOS los INSERT de tablas con esa columna
--   3. Usar tenant_id en búsquedas de personas para aislamiento correcto
-- =================================================================

-- =================================================================
-- 0. Columnas adicionales para el motor nativo de certificados
-- =================================================================

-- Código legible del certificado (trazabilidad y envío de correo)
ALTER TABLE public.certificate_jobs
  ADD COLUMN IF NOT EXISTS codigo_certificado text;

-- La columna persona_id ya existe en el schema. El batch route usa
-- "participante_id" por alias histórico; si la columna en DB es persona_id
-- aseguramos el alias virtual no rompa los inserts existentes:
-- (No se cambia nada en DB; el worker mapea participante_id → persona_id al llamar al renderer.)

-- =================================================================
-- 1. registrar_inscripcion_evento
--    Inserta en: personas, inscripciones, respuestas_formulario, verificaciones_correo
-- =================================================================

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
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_token_verificacion text;
    v_correo_clean text;
    v_doc_clean text;
    v_tipo_doc_clean text;
BEGIN
    v_correo_clean    := lower(trim(p_correo));
    v_doc_clean       := trim(p_numero_documento);
    v_tipo_doc_clean  := trim(p_tipo_documento);

    -- ── 0. Obtener tenant desde el evento ──────────────────────────
    SELECT tenant_id INTO v_tenant_id
    FROM public.eventos
    WHERE id = p_evento_id;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado o sin tenant asignado.');
    END IF;

    -- ── 1. Buscar persona solo dentro del tenant ───────────────────
    SELECT p.id INTO v_persona_id
    FROM public.personas p
    WHERE trim(p.numero_documento) = v_doc_clean
      AND trim(p.tipo_documento)   = v_tipo_doc_clean
      AND p.tenant_id              = v_tenant_id
    LIMIT 1;

    -- ── 2. Crear o actualizar persona ──────────────────────────────
    IF v_persona_id IS NOT NULL THEN
        UPDATE public.personas
        SET correo                    = v_correo_clean,
            nombres                   = COALESCE(p_nombres, nombres),
            apellidos                 = COALESCE(p_apellidos, apellidos),
            telefono                  = COALESCE(p_telefono, telefono),
            empresa                   = COALESCE(p_empresa, empresa),
            cargo                     = COALESCE(p_cargo, cargo),
            municipio                 = COALESCE(p_municipio, municipio),
            departamento              = COALESCE(p_departamento, departamento),
            tratamiento_datos_aceptado = p_tratamiento_datos_aceptado,
            updated_at                = now()
        WHERE id = v_persona_id;
    ELSE
        INSERT INTO public.personas (
            tipo_documento, numero_documento, correo,
            nombres, apellidos, telefono, empresa, cargo,
            municipio, departamento, tratamiento_datos_aceptado,
            correo_verificado, updated_at,
            tenant_id                          -- ← EXPLÍCITO
        )
        VALUES (
            v_tipo_doc_clean, v_doc_clean, v_correo_clean,
            p_nombres, p_apellidos, p_telefono, p_empresa, p_cargo,
            p_municipio, p_departamento, p_tratamiento_datos_aceptado,
            false, now(),
            v_tenant_id                        -- ← EXPLÍCITO
        )
        RETURNING id INTO v_persona_id;
    END IF;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se pudo crear o identificar a la persona.');
    END IF;

    -- ── 3. Crear o actualizar inscripción ──────────────────────────
    INSERT INTO public.inscripciones (
        evento_id, persona_id, estado, fuente,
        tratamiento_datos_aceptado, updated_at,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_evento_id, v_persona_id, 'pendiente_verificacion', p_fuente,
        p_tratamiento_datos_aceptado, now(),
        v_tenant_id                            -- ← EXPLÍCITO
    )
    ON CONFLICT (evento_id, persona_id) DO UPDATE
    SET estado                    = 'pendiente_verificacion',
        fuente                    = EXCLUDED.fuente,
        tratamiento_datos_aceptado = EXCLUDED.tratamiento_datos_aceptado,
        tenant_id                 = EXCLUDED.tenant_id,  -- ← actualiza si quedó NULL
        updated_at                = now()
    RETURNING id INTO v_inscripcion_id;

    -- ── 4. Guardar respuestas ──────────────────────────────────────
    INSERT INTO public.respuestas_formulario (
        formulario_id, evento_id, persona_id, inscripcion_id,
        respuesta_json,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_formulario_id, p_evento_id, v_persona_id, v_inscripcion_id,
        p_respuesta_json,
        v_tenant_id                            -- ← EXPLÍCITO
    )
    ON CONFLICT (formulario_id, inscripcion_id) DO UPDATE
    SET evento_id      = EXCLUDED.evento_id,
        persona_id     = EXCLUDED.persona_id,
        respuesta_json = EXCLUDED.respuesta_json,
        tenant_id      = EXCLUDED.tenant_id;   -- ← actualiza si quedó NULL

    -- ── 5. Invalidar tokens pendientes anteriores ─────────────────
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id
      AND estado         = 'pendiente';

    -- ── 6. Generar nuevo token de verificación ────────────────────
    v_token_verificacion := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id, evento_id, inscripcion_id,
        correo, token, estado,
        fecha_envio, fecha_expiracion, intentos_envio,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        v_persona_id, p_evento_id, v_inscripcion_id,
        v_correo_clean, v_token_verificacion, 'pendiente',
        now(), now() + (p_minutos_expiracion || ' minutes')::interval, 1,
        v_tenant_id                            -- ← EXPLÍCITO
    );

    RETURN jsonb_build_object(
        'success',           true,
        'persona_id',        v_persona_id,
        'inscripcion_id',    v_inscripcion_id,
        'token_verificacion', v_token_verificacion
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- =================================================================
-- 2. actualizar_registro_pendiente_por_persona
--    Inserta en: respuestas_formulario, verificaciones_correo
-- =================================================================

CREATE OR REPLACE FUNCTION public.actualizar_registro_pendiente_por_persona(
    p_persona_id uuid,
    p_evento_id uuid,
    p_formulario_id uuid,
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
    p_minutos_expiracion integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_inscripcion_id uuid;
    v_token_verificacion text;
    v_correo_clean text;
    v_doc_clean text;
    v_tipo_doc_clean text;
    v_otra_persona_id uuid;
BEGIN
    v_correo_clean   := lower(trim(p_correo));
    v_doc_clean      := trim(p_numero_documento);
    v_tipo_doc_clean := trim(p_tipo_documento);

    -- ── 0. Obtener tenant ──────────────────────────────────────────
    SELECT tenant_id INTO v_tenant_id
    FROM public.eventos WHERE id = p_evento_id;

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Evento no encontrado o sin tenant asignado.');
    END IF;

    -- ── 1. Verificar inscripción pendiente ─────────────────────────
    SELECT id INTO v_inscripcion_id
    FROM public.inscripciones
    WHERE persona_id = p_persona_id
      AND evento_id  = p_evento_id
      AND estado     = 'pendiente_verificacion'
    LIMIT 1;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró una inscripción pendiente para esa persona y ese evento.');
    END IF;

    -- ── 2. Validar que el documento no pertenezca a otra persona ──
    SELECT id INTO v_otra_persona_id
    FROM public.personas
    WHERE trim(numero_documento) = v_doc_clean
      AND trim(tipo_documento)   = v_tipo_doc_clean
      AND tenant_id              = v_tenant_id
      AND id                     <> p_persona_id
    LIMIT 1;

    IF v_otra_persona_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'El documento ya pertenece a otra persona en este tenant.');
    END IF;

    -- ── 3. Actualizar persona ──────────────────────────────────────
    UPDATE public.personas
    SET tipo_documento              = v_tipo_doc_clean,
        numero_documento            = v_doc_clean,
        correo                      = v_correo_clean,
        nombres                     = p_nombres,
        apellidos                   = p_apellidos,
        telefono                    = p_telefono,
        empresa                     = p_empresa,
        cargo                       = p_cargo,
        municipio                   = p_municipio,
        departamento                = p_departamento,
        tratamiento_datos_aceptado  = p_tratamiento_datos_aceptado,
        correo_verificado           = false,
        fecha_verificacion_correo   = NULL,
        updated_at                  = now()
    WHERE id = p_persona_id;

    -- ── 4. Actualizar inscripción ──────────────────────────────────
    UPDATE public.inscripciones
    SET estado                    = 'pendiente_verificacion',
        tratamiento_datos_aceptado = p_tratamiento_datos_aceptado,
        tenant_id                 = v_tenant_id,   -- ← rellena si NULL
        updated_at                = now()
    WHERE id = v_inscripcion_id;

    -- ── 5. Actualizar respuestas ───────────────────────────────────
    INSERT INTO public.respuestas_formulario (
        formulario_id, evento_id, persona_id, inscripcion_id,
        respuesta_json,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_formulario_id, p_evento_id, p_persona_id, v_inscripcion_id,
        p_respuesta_json,
        v_tenant_id
    )
    ON CONFLICT (formulario_id, inscripcion_id) DO UPDATE
    SET evento_id      = EXCLUDED.evento_id,
        persona_id     = EXCLUDED.persona_id,
        respuesta_json = EXCLUDED.respuesta_json,
        tenant_id      = EXCLUDED.tenant_id;

    -- ── 6. Invalidar tokens previos ────────────────────────────────
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    -- ── 7. Generar nuevo token ─────────────────────────────────────
    v_token_verificacion := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id, evento_id, inscripcion_id,
        correo, token, estado,
        fecha_envio, fecha_expiracion, intentos_envio,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_persona_id, p_evento_id, v_inscripcion_id,
        v_correo_clean, v_token_verificacion, 'pendiente',
        now(), now() + (p_minutos_expiracion || ' minutes')::interval, 1,
        v_tenant_id
    );

    RETURN jsonb_build_object(
        'success',           true,
        'persona_id',        p_persona_id,
        'inscripcion_id',    v_inscripcion_id,
        'token_verificacion', v_token_verificacion
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- =================================================================
-- 3. reenviar_verificacion_por_persona
--    Inserta en: verificaciones_correo
-- =================================================================

CREATE OR REPLACE FUNCTION public.reenviar_verificacion_por_persona(
    p_persona_id uuid,
    p_evento_id uuid,
    p_minutos_expiracion integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_inscripcion_id uuid;
    v_correo text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_token text;
BEGIN
    -- ── 0. Obtener tenant ──────────────────────────────────────────
    SELECT tenant_id INTO v_tenant_id
    FROM public.eventos WHERE id = p_evento_id;

    -- ── 1. Buscar inscripción pendiente ────────────────────────────
    SELECT i.id, p.correo, p.nombres, e.titulo
    INTO v_inscripcion_id, v_correo, v_nombres, v_evento_titulo
    FROM public.inscripciones i
    JOIN public.personas p ON p.id = i.persona_id
    JOIN public.eventos e  ON e.id = i.evento_id
    WHERE i.persona_id = p_persona_id
      AND i.evento_id  = p_evento_id
      AND i.estado     = 'pendiente_verificacion'
    LIMIT 1;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró una inscripción pendiente.');
    END IF;

    -- ── 2. Invalidar previos ───────────────────────────────────────
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    -- ── 3. Nuevo token ─────────────────────────────────────────────
    v_nuevo_token := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id, evento_id, inscripcion_id,
        correo, token, estado,
        fecha_envio, fecha_expiracion, intentos_envio,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_persona_id, p_evento_id, v_inscripcion_id,
        v_correo, v_nuevo_token, 'pendiente',
        now(), now() + (p_minutos_expiracion || ' minutes')::interval, 1,
        v_tenant_id
    );

    RETURN jsonb_build_object(
        'success',           true,
        'persona_id',        p_persona_id,
        'inscripcion_id',    v_inscripcion_id,
        'token_verificacion', v_nuevo_token,
        'correo',            v_correo,
        'nombres',           v_nombres,
        'evento_titulo',     v_evento_titulo
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- =================================================================
-- 4. actualizar_correo_y_reenviar_verificacion
--    Inserta en: verificaciones_correo
-- =================================================================

CREATE OR REPLACE FUNCTION public.actualizar_correo_y_reenviar_verificacion(
    p_numero_documento text,
    p_tipo_documento text,
    p_nuevo_correo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_evento_id uuid;
    v_nuevo_token text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_correo_clean text;
BEGIN
    v_nuevo_correo_clean := lower(trim(p_nuevo_correo));

    -- ── 1. Buscar persona e inscripción más reciente ───────────────
    SELECT p.id, i.id, i.evento_id, p.nombres, e.titulo, i.tenant_id
    INTO v_persona_id, v_inscripcion_id, v_evento_id, v_nombres, v_evento_titulo, v_tenant_id
    FROM public.personas p
    JOIN public.inscripciones i ON i.persona_id = p.id
    JOIN public.eventos e       ON e.id         = i.evento_id
    WHERE trim(p.numero_documento) = trim(p_numero_documento)
      AND trim(p.tipo_documento)   = trim(p_tipo_documento)
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró registro con ese documento.');
    END IF;

    -- ── 2. Actualizar correo ───────────────────────────────────────
    UPDATE public.personas
    SET correo            = v_nuevo_correo_clean,
        correo_verificado = false,
        updated_at        = now()
    WHERE id = v_persona_id;

    -- ── 3. Invalidar tokens previos ────────────────────────────────
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    -- ── 4. Nuevo token ─────────────────────────────────────────────
    v_nuevo_token := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id, evento_id, inscripcion_id,
        correo, token, estado,
        fecha_envio, fecha_expiracion,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        v_persona_id, v_evento_id, v_inscripcion_id,
        v_nuevo_correo_clean, v_nuevo_token, 'pendiente',
        now(), now() + interval '60 minutes',
        v_tenant_id
    );

    RETURN jsonb_build_object(
        'success',           true,
        'mensaje',           'Correo actualizado y nuevo token generado.',
        'token_verificacion', v_nuevo_token,
        'nombres',           v_nombres,
        'evento_titulo',     v_evento_titulo
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- =================================================================
-- 5. reenviar_verificacion_inscripcion
--    Inserta en: verificaciones_correo
-- =================================================================

CREATE OR REPLACE FUNCTION public.reenviar_verificacion_inscripcion(
    p_numero_documento text,
    p_tipo_documento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_persona_id uuid;
    v_inscripcion_id uuid;
    v_evento_id uuid;
    v_correo text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_token text;
BEGIN
    SELECT p.id, i.id, i.evento_id, p.correo, p.nombres, e.titulo, i.tenant_id
    INTO v_persona_id, v_inscripcion_id, v_evento_id, v_correo, v_nombres, v_evento_titulo, v_tenant_id
    FROM public.personas p
    JOIN public.inscripciones i ON i.persona_id = p.id
    JOIN public.eventos e       ON e.id         = i.evento_id
    WHERE trim(p.numero_documento) = trim(p_numero_documento)
      AND trim(p.tipo_documento)   = trim(p_tipo_documento)
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró registro para el documento.');
    END IF;

    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id AND estado = 'pendiente';

    v_nuevo_token := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id, evento_id, inscripcion_id,
        correo, token, estado,
        fecha_envio, fecha_expiracion,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        v_persona_id, v_evento_id, v_inscripcion_id,
        v_correo, v_nuevo_token, 'pendiente',
        now(), now() + interval '60 minutes',
        v_tenant_id
    );

    RETURN jsonb_build_object(
        'success',           true,
        'token_verificacion', v_nuevo_token,
        'correo',            v_correo,
        'nombres',           v_nombres,
        'evento_titulo',     v_evento_titulo
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- =================================================================
-- 6. registrar_asistencia_por_qr
--    Inserta en: asistencias
-- =================================================================

CREATE OR REPLACE FUNCTION public.registrar_asistencia_por_qr(
    p_token text,
    p_numero_documento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_token_id uuid;
    v_sesion_id uuid;
    v_evento_id uuid;
    v_persona_id uuid;
    v_asistencia_id uuid;
    v_inscripcion_id uuid;
    v_fecha date;
    v_h_inicio time;
    v_h_fin time;
    v_ahora_bogota timestamp;
    v_inicio_completo timestamp;
    v_fin_completo timestamp;
BEGIN
    -- ── 1. Validar token y obtener datos de sesión ─────────────────
    SELECT q.id, q.sesion_evento_id, q.evento_id,
           s.fecha, s.hora_inicio, s.hora_fin
    INTO v_token_id, v_sesion_id, v_evento_id, v_fecha, v_h_inicio, v_h_fin
    FROM public.qr_tokens_asistencia q
    JOIN public.sesiones_evento s ON q.sesion_evento_id = s.id
    WHERE q.token = p_token AND q.activo = true;

    IF v_token_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Este código QR no está disponible o ya no está activo.', 'error_type', 'INVALID_TOKEN');
    END IF;

    -- ── 1.1. Validar horario de la sesión (Bogotá) ─────────────────
    v_ahora_bogota    := now() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    v_inicio_completo := (v_fecha + v_h_inicio)::timestamp;
    v_fin_completo    := (v_fecha + v_h_fin)::timestamp;

    IF v_ahora_bogota < v_inicio_completo THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Aún no es momento de registrar asistencia. La sesión inicia a las ' || to_char(v_h_inicio, 'HH12:MI AM'), 'error_type', 'SESSION_NOT_STARTED');
    END IF;

    IF v_ahora_bogota > (v_fin_completo + interval '30 minutes') THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El tiempo para registrar asistencia en esta sesión ha expirado.', 'error_type', 'SESSION_EXPIRED');
    END IF;

    -- ── 2. Obtener tenant desde el evento ──────────────────────────
    SELECT tenant_id INTO v_tenant_id
    FROM public.eventos WHERE id = v_evento_id;

    -- ── 3. Buscar persona dentro del tenant ───────────────────────
    SELECT id INTO v_persona_id
    FROM public.personas
    WHERE numero_documento = p_numero_documento
      AND tenant_id        = v_tenant_id;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'La cédula ingresada no se encuentra registrada.', 'error_type', 'PERSON_NOT_FOUND');
    END IF;

    -- ── 4. Verificar inscripción ───────────────────────────────────
    SELECT id INTO v_inscripcion_id
    FROM public.inscripciones
    WHERE evento_id  = v_evento_id
      AND persona_id = v_persona_id;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Esta persona no está inscrita en este evento.', 'error_type', 'NOT_REGISTERED_FOR_EVENT');
    END IF;

    -- ── 5. Verificar duplicidad ───────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM public.asistencias
        WHERE sesion_evento_id = v_sesion_id AND persona_id = v_persona_id
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Esta persona ya registró asistencia en esta sesión.', 'already_registered', true);
    END IF;

    -- ── 6. Insertar asistencia ─────────────────────────────────────
    INSERT INTO public.asistencias (
        evento_id, sesion_evento_id, persona_id, inscripcion_id,
        qr_token_id, numero_documento_digitado,
        metodo_registro, fecha_hora_registro, valido,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        v_evento_id, v_sesion_id, v_persona_id, v_inscripcion_id,
        v_token_id, p_numero_documento,
        'QR_PUBLIC', now(), true,
        v_tenant_id                            -- ← EXPLÍCITO
    )
    RETURNING id INTO v_asistencia_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', '¡Asistencia registrada exitosamente!', 'asistencia_id', v_asistencia_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', 'Error inesperado: ' || SQLERRM);
END;
$$;


-- =================================================================
-- 7. generar_qr_sesion
--    Inserta en: qr_tokens_asistencia
-- =================================================================

CREATE OR REPLACE FUNCTION public.generar_qr_sesion(
    p_sesion_evento_id uuid,
    p_observacion text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_evento_id uuid;
    v_token text;
    v_qr_id uuid;
BEGIN
    -- ── 0. Validar sesión y obtener tenant ─────────────────────────
    SELECT s.evento_id, e.tenant_id
    INTO v_evento_id, v_tenant_id
    FROM public.sesiones_evento s
    JOIN public.eventos e ON e.id = s.evento_id
    WHERE s.id = p_sesion_evento_id;

    IF v_evento_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Sesión no encontrada.');
    END IF;

    -- ── 1. Verificar que no haya un QR activo o generado ──────────
    IF EXISTS (
        SELECT 1 FROM public.qr_tokens_asistencia
        WHERE sesion_evento_id = p_sesion_evento_id
          AND estado IN ('activo', 'generado', 'inactivo')
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Ya existe un QR para esta sesión. Cancela o elimina el anterior primero.');
    END IF;

    -- ── 2. Generar token único ─────────────────────────────────────
    v_token := encode(
        digest(p_sesion_evento_id::text || now()::text || random()::text, 'sha256'), 'hex'
    );

    -- ── 3. Insertar QR ────────────────────────────────────────────
    INSERT INTO public.qr_tokens_asistencia (
        sesion_evento_id, evento_id,
        token, estado, activo,
        observacion,
        tenant_id                              -- ← EXPLÍCITO
    )
    VALUES (
        p_sesion_evento_id, v_evento_id,
        v_token, 'generado', false,
        p_observacion,
        v_tenant_id                            -- ← EXPLÍCITO
    )
    RETURNING id INTO v_qr_id;

    RETURN jsonb_build_object(
        'ok',      true,
        'mensaje', 'QR generado correctamente. Actívalo cuando empiece la sesión.',
        'qr_id',   v_qr_id,
        'token',   v_token
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', 'Error inesperado: ' || SQLERRM);
END;
$$;


-- =================================================================
-- 8. desactivar_qr_sesion (solo UPDATEs → no requiere tenant_id)
-- =================================================================

CREATE OR REPLACE FUNCTION public.desactivar_qr_sesion(
    p_qr_token_id uuid,
    p_desactivado_por text DEFAULT NULL,
    p_observacion text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.qr_tokens_asistencia WHERE id = p_qr_token_id AND estado = 'activo') THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El QR no está activo o no existe.');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo            = false,
        estado            = 'cerrado',
        desactivado_por   = p_desactivado_por,
        observacion       = COALESCE(p_observacion, observacion),
        fecha_desactivacion = now()
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR desactivado correctamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- =================================================================
-- 9. cancelar_qr_sesion (solo UPDATEs)
-- =================================================================

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
    IF NOT EXISTS (SELECT 1 FROM public.qr_tokens_asistencia WHERE id = p_qr_token_id) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'QR no encontrado.');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo      = false,
        estado      = 'cancelado',
        observacion = COALESCE(p_observacion, observacion),
        fecha_desactivacion = now()
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR cancelado correctamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- =================================================================
-- 10. eliminar_qr_sesion (solo DELETE → no requiere tenant_id)
-- =================================================================

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
        WHERE id = p_qr_token_id AND estado IN ('cancelado', 'cerrado')
    ) THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Solo se pueden eliminar QRs cancelados o cerrados.');
    END IF;

    DELETE FROM public.qr_tokens_asistencia WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'QR eliminado permanentemente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;


-- =================================================================
-- 11. guardar_campo_plantilla_evento
--     Inserta en: plantilla_campos_certificado
--     Acepta todos los parámetros tipográficos para que el editor
--     pueda persistir font_family, font_weight, color, etc.
-- =================================================================

CREATE OR REPLACE FUNCTION public.guardar_campo_plantilla_evento(
    p_evento_id       uuid,
    p_tipo_campo      text,
    p_etiqueta        text,
    p_posicion_x      numeric,
    p_posicion_y      numeric,
    p_ancho_caja      numeric,
    p_alto_caja       numeric,
    p_text_align      text,
    p_font_size       integer  DEFAULT 24,
    p_visible         boolean  DEFAULT true,
    p_orden           integer  DEFAULT 0,
    -- Parámetros tipográficos (antes hardcodeados, ahora configurables)
    p_font_family     text     DEFAULT 'Arial',
    p_font_weight     text     DEFAULT 'normal',
    p_color           text     DEFAULT '#000000',
    p_line_height     numeric  DEFAULT 1.2,
    p_letter_spacing  numeric  DEFAULT 0,
    p_auto_fit        boolean  DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id    uuid;
    v_plantilla_id uuid;
    v_campo_id     uuid;
BEGIN
    -- ── 0. Obtener plantilla y tenant desde el evento ──────────────
    SELECT e.plantilla_certificado_id, e.tenant_id
    INTO   v_plantilla_id, v_tenant_id
    FROM   public.eventos e
    WHERE  e.id = p_evento_id;

    IF v_plantilla_id IS NULL THEN
        RAISE EXCEPTION 'El evento no tiene una plantilla de certificado asociada.';
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'El evento no tiene tenant_id asignado.';
    END IF;

    -- ── 1. Upsert campo de plantilla ──────────────────────────────
    INSERT INTO public.plantilla_campos_certificado (
        plantilla_certificado_id,
        tipo_campo, etiqueta,
        pos_x, pos_y, width, height,
        text_align, font_size, visible, orden,
        font_family, font_weight, color,
        line_height, letter_spacing, auto_fit,
        tenant_id
    )
    VALUES (
        v_plantilla_id,
        p_tipo_campo, p_etiqueta,
        p_posicion_x, p_posicion_y, p_ancho_caja, p_alto_caja,
        p_text_align, p_font_size, p_visible, p_orden,
        p_font_family, p_font_weight, p_color,
        p_line_height, p_letter_spacing, p_auto_fit,
        v_tenant_id
    )
    ON CONFLICT (plantilla_certificado_id, tipo_campo) DO UPDATE
    SET etiqueta       = EXCLUDED.etiqueta,
        pos_x          = EXCLUDED.pos_x,
        pos_y          = EXCLUDED.pos_y,
        width          = EXCLUDED.width,
        height         = EXCLUDED.height,
        text_align     = EXCLUDED.text_align,
        font_size      = EXCLUDED.font_size,
        visible        = EXCLUDED.visible,
        orden          = EXCLUDED.orden,
        font_family    = EXCLUDED.font_family,   -- ← Ahora se actualiza
        font_weight    = EXCLUDED.font_weight,   -- ← Ahora se actualiza
        color          = EXCLUDED.color,         -- ← Ahora se actualiza
        line_height    = EXCLUDED.line_height,   -- ← Ahora se actualiza
        letter_spacing = EXCLUDED.letter_spacing,-- ← Ahora se actualiza
        auto_fit       = EXCLUDED.auto_fit,
        tenant_id      = EXCLUDED.tenant_id,
        updated_at     = now()
    RETURNING id INTO v_campo_id;

    RETURN v_campo_id;
END;
$$;


-- =================================================================
-- 12. activar_qr_sesion (solo UPDATEs → no requiere tenant_id)
--     Re-crear para mantener consistencia de naming con sesion_evento_id
-- =================================================================

CREATE OR REPLACE FUNCTION public.activar_qr_sesion(p_qr_token_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    SELECT s.id, s.fecha, s.hora_inicio, s.hora_fin
    INTO v_sesion_id, v_fecha, v_hora_inicio, v_hora_fin
    FROM public.qr_tokens_asistencia q
    JOIN public.sesiones_evento s ON q.sesion_evento_id = s.id
    WHERE q.id = p_qr_token_id;

    IF v_sesion_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Código QR no encontrado.');
    END IF;

    v_ahora_bogota := now() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota';
    v_fecha_hoy    := v_ahora_bogota::date;
    v_hora_actual  := v_ahora_bogota::time;

    IF v_fecha_hoy != v_fecha THEN
        IF v_fecha_hoy < v_fecha THEN
            RETURN jsonb_build_object('ok', false, 'mensaje', 'Este QR solo puede activarse el día de la sesión (' || to_char(v_fecha, 'DD/MM/YYYY') || ').');
        ELSE
            RETURN jsonb_build_object('ok', false, 'mensaje', 'La fecha programada para esta sesión ya pasó.');
        END IF;
    END IF;

    IF v_hora_actual < v_hora_inicio THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'Aún no es la hora de inicio. Podrás activarlo a las ' || to_char(v_hora_inicio, 'HH12:MI AM') || '.');
    END IF;

    IF v_hora_actual > v_hora_fin THEN
        RETURN jsonb_build_object('ok', false, 'mensaje', 'El horario de esta sesión ha finalizado (' || to_char(v_hora_fin, 'HH12:MI AM') || ').');
    END IF;

    UPDATE public.qr_tokens_asistencia
    SET activo            = true,
        estado            = 'activo',
        fecha_activacion  = now(),
        fecha_desactivacion = NULL
    WHERE id = p_qr_token_id;

    RETURN jsonb_build_object('ok', true, 'mensaje', 'Código QR activado exitosamente.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'mensaje', SQLERRM);
END;
$$;
