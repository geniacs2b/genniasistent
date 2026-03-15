-- =========================================================
-- FLUJO COMPLETO DE REGISTRO / EDICIÓN / CANCELACIÓN / VERIFICACIÓN
-- REGLA: PERSONA ÚNICA SOLO POR TIPO_DOCUMENTO + NUMERO_DOCUMENTO
-- EL CORREO PUEDE REPETIRSE
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 0. MIGRACIONES EN CALIENTE
-- =========================================================

DO $$
BEGIN
    -- personas
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personas'
          AND column_name = 'tratamiento_datos_aceptado'
    ) THEN
        ALTER TABLE public.personas
        ADD COLUMN tratamiento_datos_aceptado boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personas'
          AND column_name = 'correo_verificado'
    ) THEN
        ALTER TABLE public.personas
        ADD COLUMN correo_verificado boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personas'
          AND column_name = 'fecha_verificacion_correo'
    ) THEN
        ALTER TABLE public.personas
        ADD COLUMN fecha_verificacion_correo timestamptz;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'personas'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.personas
        ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;

    -- inscripciones
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inscripciones'
          AND column_name = 'tratamiento_datos_aceptado'
    ) THEN
        ALTER TABLE public.inscripciones
        ADD COLUMN tratamiento_datos_aceptado boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inscripciones'
          AND column_name = 'fuente'
    ) THEN
        ALTER TABLE public.inscripciones
        ADD COLUMN fuente text;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'inscripciones'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.inscripciones
        ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;

    -- verificaciones_correo
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'verificaciones_correo'
          AND column_name = 'intentos_envio'
    ) THEN
        ALTER TABLE public.verificaciones_correo
        ADD COLUMN intentos_envio integer DEFAULT 1;
    END IF;
END $$;

-- =========================================================
-- 1. ELIMINAR UNIQUE SOBRE CORREO EN PERSONAS
--    (el correo puede repetirse)
-- =========================================================

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN unnest(c.conkey) AS ck(attnum) ON true
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ck.attnum
        WHERE n.nspname = 'public'
          AND t.relname = 'personas'
          AND c.contype = 'u'
        GROUP BY c.conname
        HAVING bool_or(a.attname = 'correo')
    LOOP
        EXECUTE format('ALTER TABLE public.personas DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT i.indexname
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND i.tablename = 'personas'
          AND i.indexdef ILIKE '%UNIQUE%'
          AND i.indexdef ILIKE '%correo%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    END LOOP;
END $$;

-- =========================================================
-- 2. ASEGURAR RESTRICCIONES CLAVE
-- =========================================================

-- persona única por documento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'personas_documento_unique'
    ) THEN
        ALTER TABLE public.personas
        ADD CONSTRAINT personas_documento_unique
        UNIQUE (tipo_documento, numero_documento);
    END IF;
END $$;

-- una inscripción por evento + persona
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'inscripciones_evento_persona_unique'
    ) THEN
        ALTER TABLE public.inscripciones
        ADD CONSTRAINT inscripciones_evento_persona_unique
        UNIQUE (evento_id, persona_id);
    END IF;
END $$;

-- una respuesta por formulario + inscripción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'respuestas_formulario_unique'
    ) THEN
        ALTER TABLE public.respuestas_formulario
        ADD CONSTRAINT respuestas_formulario_unique
        UNIQUE (formulario_id, inscripcion_id);
    END IF;
END $$;

-- un solo token pendiente por inscripción
CREATE UNIQUE INDEX IF NOT EXISTS verificaciones_correo_un_pendiente_por_inscripcion
ON public.verificaciones_correo (inscripcion_id)
WHERE estado = 'pendiente';

-- =========================================================
-- 3. LIMPIAR FUNCIONES ANTERIORES
-- =========================================================

DROP FUNCTION IF EXISTS public.registrar_inscripcion_evento(
    uuid, uuid, text, text, text, text, text, text, text, text, text, text, boolean, jsonb, text, integer
);

DROP FUNCTION IF EXISTS public.actualizar_registro_pendiente_por_persona(
    uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, boolean, jsonb, integer
);

DROP FUNCTION IF EXISTS public.cancelar_registro_pendiente_por_persona(uuid, uuid);
DROP FUNCTION IF EXISTS public.verificar_correo_inscripcion(text);
DROP FUNCTION IF EXISTS public.reenviar_verificacion_por_persona(uuid, uuid, integer);

-- =========================================================
-- 4. REGISTRAR INSCRIPCIÓN
--    CREA PERSONA POR DOCUMENTO, INSCRIPCIÓN, RESPUESTAS Y TOKEN
-- =========================================================

CREATE FUNCTION public.registrar_inscripcion_evento(
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
    v_correo_clean text;
    v_doc_clean text;
    v_tipo_doc_clean text;
BEGIN
    v_correo_clean := lower(trim(p_correo));
    v_doc_clean := trim(p_numero_documento);
    v_tipo_doc_clean := trim(p_tipo_documento);

    -- Buscar persona SOLO por documento
    SELECT p.id
    INTO v_persona_id
    FROM public.personas p
    WHERE trim(p.numero_documento) = v_doc_clean
      AND trim(p.tipo_documento) = v_tipo_doc_clean
    LIMIT 1;

    -- Crear o actualizar persona
    IF v_persona_id IS NOT NULL THEN
        UPDATE public.personas
        SET
            correo = v_correo_clean,
            nombres = COALESCE(p_nombres, nombres),
            apellidos = COALESCE(p_apellidos, apellidos),
            telefono = COALESCE(p_telefono, telefono),
            empresa = COALESCE(p_empresa, empresa),
            cargo = COALESCE(p_cargo, cargo),
            municipio = COALESCE(p_municipio, municipio),
            departamento = COALESCE(p_departamento, departamento),
            tratamiento_datos_aceptado = p_tratamiento_datos_aceptado,
            updated_at = now()
        WHERE id = v_persona_id;
    ELSE
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
            tratamiento_datos_aceptado,
            correo_verificado,
            updated_at
        )
        VALUES (
            v_tipo_doc_clean,
            v_doc_clean,
            v_correo_clean,
            p_nombres,
            p_apellidos,
            p_telefono,
            p_empresa,
            p_cargo,
            p_municipio,
            p_departamento,
            p_tratamiento_datos_aceptado,
            false,
            now()
        )
        RETURNING id INTO v_persona_id;
    END IF;

    IF v_persona_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se pudo crear o identificar a la persona.'
        );
    END IF;

    -- Crear o actualizar inscripción
    INSERT INTO public.inscripciones (
        evento_id,
        persona_id,
        estado,
        fuente,
        tratamiento_datos_aceptado,
        updated_at
    )
    VALUES (
        p_evento_id,
        v_persona_id,
        'pendiente_verificacion',
        p_fuente,
        p_tratamiento_datos_aceptado,
        now()
    )
    ON CONFLICT (evento_id, persona_id) DO UPDATE
    SET
        estado = 'pendiente_verificacion',
        fuente = EXCLUDED.fuente,
        tratamiento_datos_aceptado = EXCLUDED.tratamiento_datos_aceptado,
        updated_at = now()
    RETURNING id INTO v_inscripcion_id;

    -- Guardar respuestas
    INSERT INTO public.respuestas_formulario (
        formulario_id,
        evento_id,
        persona_id,
        inscripcion_id,
        respuesta_json
    )
    VALUES (
        p_formulario_id,
        p_evento_id,
        v_persona_id,
        v_inscripcion_id,
        p_respuesta_json
    )
    ON CONFLICT (formulario_id, inscripcion_id) DO UPDATE
    SET
        evento_id = EXCLUDED.evento_id,
        persona_id = EXCLUDED.persona_id,
        respuesta_json = EXCLUDED.respuesta_json;

    -- Invalidar tokens pendientes anteriores
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id
      AND estado = 'pendiente';

    -- Generar nuevo token
    v_token_verificacion := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'),
        'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id,
        evento_id,
        inscripcion_id,
        correo,
        token,
        estado,
        fecha_envio,
        fecha_expiracion,
        intentos_envio
    )
    VALUES (
        v_persona_id,
        p_evento_id,
        v_inscripcion_id,
        v_correo_clean,
        v_token_verificacion,
        'pendiente',
        now(),
        now() + (p_minutos_expiracion || ' minutes')::interval,
        1
    );

    RETURN jsonb_build_object(
        'success', true,
        'persona_id', v_persona_id,
        'inscripcion_id', v_inscripcion_id,
        'token_verificacion', v_token_verificacion
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =========================================================
-- 5. EDITAR REGISTRO PENDIENTE USANDO persona_id
--    ACTUALIZA PERSONA, RESPUESTAS E INSCRIPCIÓN SOBRE EL MISMO ID
-- =========================================================

CREATE FUNCTION public.actualizar_registro_pendiente_por_persona(
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
AS $$
DECLARE
    v_inscripcion_id uuid;
    v_token_verificacion text;
    v_correo_clean text;
    v_doc_clean text;
    v_tipo_doc_clean text;
    v_otra_persona_id uuid;
BEGIN
    v_correo_clean := lower(trim(p_correo));
    v_doc_clean := trim(p_numero_documento);
    v_tipo_doc_clean := trim(p_tipo_documento);

    -- Verificar que exista la inscripción pendiente de esa misma persona
    SELECT i.id
    INTO v_inscripcion_id
    FROM public.inscripciones i
    WHERE i.persona_id = p_persona_id
      AND i.evento_id = p_evento_id
      AND i.estado = 'pendiente_verificacion'
    LIMIT 1;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se encontró una inscripción pendiente para esa persona y ese evento.'
        );
    END IF;

    -- Validar que el nuevo documento no pertenezca a otra persona diferente
    SELECT p.id
    INTO v_otra_persona_id
    FROM public.personas p
    WHERE trim(p.numero_documento) = v_doc_clean
      AND trim(p.tipo_documento) = v_tipo_doc_clean
      AND p.id <> p_persona_id
    LIMIT 1;

    IF v_otra_persona_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'La cédula o documento ingresado ya pertenece a otra persona.'
        );
    END IF;

    -- Actualizar persona SOBRE EL MISMO persona_id
    UPDATE public.personas
    SET
        tipo_documento = v_tipo_doc_clean,
        numero_documento = v_doc_clean,
        correo = v_correo_clean,
        nombres = p_nombres,
        apellidos = p_apellidos,
        telefono = p_telefono,
        empresa = p_empresa,
        cargo = p_cargo,
        municipio = p_municipio,
        departamento = p_departamento,
        tratamiento_datos_aceptado = p_tratamiento_datos_aceptado,
        correo_verificado = false,
        fecha_verificacion_correo = NULL,
        updated_at = now()
    WHERE id = p_persona_id;

    -- Actualizar inscripción
    UPDATE public.inscripciones
    SET
        estado = 'pendiente_verificacion',
        tratamiento_datos_aceptado = p_tratamiento_datos_aceptado,
        updated_at = now()
    WHERE id = v_inscripcion_id;

    -- Actualizar respuestas
    INSERT INTO public.respuestas_formulario (
        formulario_id,
        evento_id,
        persona_id,
        inscripcion_id,
        respuesta_json
    )
    VALUES (
        p_formulario_id,
        p_evento_id,
        p_persona_id,
        v_inscripcion_id,
        p_respuesta_json
    )
    ON CONFLICT (formulario_id, inscripcion_id) DO UPDATE
    SET
        evento_id = EXCLUDED.evento_id,
        persona_id = EXCLUDED.persona_id,
        respuesta_json = EXCLUDED.respuesta_json;

    -- Invalidar tokens pendientes anteriores
    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id
      AND estado = 'pendiente';

    -- Generar nuevo token
    v_token_verificacion := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'),
        'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id,
        evento_id,
        inscripcion_id,
        correo,
        token,
        estado,
        fecha_envio,
        fecha_expiracion,
        intentos_envio
    )
    VALUES (
        p_persona_id,
        p_evento_id,
        v_inscripcion_id,
        v_correo_clean,
        v_token_verificacion,
        'pendiente',
        now(),
        now() + (p_minutos_expiracion || ' minutes')::interval,
        1
    );

    RETURN jsonb_build_object(
        'success', true,
        'persona_id', p_persona_id,
        'inscripcion_id', v_inscripcion_id,
        'token_verificacion', v_token_verificacion
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =========================================================
-- 6. REENVIAR VERIFICACIÓN USANDO persona_id
-- =========================================================

CREATE FUNCTION public.reenviar_verificacion_por_persona(
    p_persona_id uuid,
    p_evento_id uuid,
    p_minutos_expiracion integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscripcion_id uuid;
    v_correo text;
    v_nombres text;
    v_evento_titulo text;
    v_nuevo_token text;
BEGIN
    SELECT i.id, p.correo, p.nombres, e.titulo
    INTO v_inscripcion_id, v_correo, v_nombres, v_evento_titulo
    FROM public.inscripciones i
    JOIN public.personas p ON p.id = i.persona_id
    JOIN public.eventos e ON e.id = i.evento_id
    WHERE i.persona_id = p_persona_id
      AND i.evento_id = p_evento_id
      AND i.estado = 'pendiente_verificacion'
    LIMIT 1;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se encontró una inscripción pendiente para esa persona y ese evento.'
        );
    END IF;

    UPDATE public.verificaciones_correo
    SET estado = 'invalidado'
    WHERE inscripcion_id = v_inscripcion_id
      AND estado = 'pendiente';

    v_nuevo_token := encode(
        digest(v_inscripcion_id::text || now()::text || random()::text, 'sha256'),
        'hex'
    );

    INSERT INTO public.verificaciones_correo (
        persona_id,
        evento_id,
        inscripcion_id,
        correo,
        token,
        estado,
        fecha_envio,
        fecha_expiracion,
        intentos_envio
    )
    VALUES (
        p_persona_id,
        p_evento_id,
        v_inscripcion_id,
        v_correo,
        v_nuevo_token,
        'pendiente',
        now(),
        now() + (p_minutos_expiracion || ' minutes')::interval,
        1
    );

    RETURN jsonb_build_object(
        'success', true,
        'persona_id', p_persona_id,
        'inscripcion_id', v_inscripcion_id,
        'token_verificacion', v_nuevo_token,
        'correo', v_correo,
        'nombres', v_nombres,
        'evento_titulo', v_evento_titulo
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- =========================================================
-- 7. VERIFICAR CORREO
-- =========================================================

CREATE FUNCTION public.verificar_correo_inscripcion(p_token text)
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
    v_clean_token := lower(trim(p_token));

    SELECT vc.id, vc.inscripcion_id, vc.persona_id
    INTO v_verificacion_id, v_inscripcion_id, v_persona_id
    FROM public.verificaciones_correo vc
    WHERE lower(trim(vc.token)) = v_clean_token
      AND vc.estado = 'pendiente'
      AND vc.fecha_expiracion > now()
    LIMIT 1;

    IF v_verificacion_id IS NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.verificaciones_correo
            WHERE lower(trim(token)) = v_clean_token
              AND estado = 'verificado'
        ) THEN
            RETURN jsonb_build_object(
                'ok', false,
                'mensaje', 'Este enlace ya fue utilizado anteriormente.'
            );
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.verificaciones_correo
            WHERE lower(trim(token)) = v_clean_token
              AND fecha_expiracion <= now()
        ) THEN
            UPDATE public.verificaciones_correo
            SET estado = 'expirado'
            WHERE lower(trim(token)) = v_clean_token
              AND estado = 'pendiente';

            RETURN jsonb_build_object(
                'ok', false,
                'mensaje', 'El enlace de verificación ha expirado.'
            );
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.verificaciones_correo
            WHERE lower(trim(token)) = v_clean_token
              AND estado = 'invalidado'
        ) THEN
            RETURN jsonb_build_object(
                'ok', false,
                'mensaje', 'Este enlace ya no es válido porque fue reemplazado por uno más reciente.'
            );
        END IF;

        RETURN jsonb_build_object(
            'ok', false,
            'mensaje', 'Enlace de verificación inválido o corrupto.'
        );
    END IF;

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

    RETURN jsonb_build_object(
        'ok', true,
        'mensaje', '¡Correo verificado con éxito!'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'ok', false,
            'mensaje', SQLERRM
        );
END;
$$;

-- =========================================================
-- 8. CANCELAR REGISTRO PENDIENTE USANDO persona_id
-- =========================================================

CREATE FUNCTION public.cancelar_registro_pendiente_por_persona(
    p_persona_id uuid,
    p_evento_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscripcion_id uuid;
    v_estado text;
BEGIN
    SELECT i.id, i.estado
    INTO v_inscripcion_id, v_estado
    FROM public.inscripciones i
    WHERE i.persona_id = p_persona_id
      AND i.evento_id = p_evento_id
    LIMIT 1;

    IF v_inscripcion_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se encontró la inscripción para esa persona y ese evento.'
        );
    END IF;

    IF v_estado = 'inscrito' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No se puede cancelar una inscripción ya verificada.'
        );
    END IF;

    -- Respuestas del formulario
    DELETE FROM public.respuestas_formulario
    WHERE inscripcion_id = v_inscripcion_id;

    -- Verificaciones de correo
    DELETE FROM public.verificaciones_correo
    WHERE inscripcion_id = v_inscripcion_id;

    -- Inscripción
    DELETE FROM public.inscripciones
    WHERE id = v_inscripcion_id;

    -- eliminar persona solo si no tiene más inscripciones
    IF NOT EXISTS (
        SELECT 1
        FROM public.inscripciones
        WHERE persona_id = p_persona_id
    ) THEN
        DELETE FROM public.personas
        WHERE id = p_persona_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Registro cancelado y datos eliminados correctamente.'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;
