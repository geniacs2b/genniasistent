-- =========================================================
-- SISTEMA DE CORREO INSTITUCIONAL - SCHEMA Y LÓGICA
-- =========================================================

-- 1. Tablas de Configuración y Plantillas
CREATE TABLE IF NOT EXISTS public.configuracion_correo_sistema (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_remitente text NOT NULL,
    email_respuesta text NOT NULL,
    logo_url text,
    firma_html text,
    footer_html text,
    telefono_contacto text,
    email_contacto text,
    direccion_contacto text,
    sitio_web text,
    facebook_url text,
    instagram_url text,
    linkedin_url text,
    x_url text,
    mostrar_footer boolean DEFAULT true,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plantillas_correo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_plantilla text NOT NULL,
    tipo_plantilla text, -- bienvenida, certificado, informativo
    asunto text NOT NULL,
    mensaje_html text NOT NULL,
    usar_firma_sistema boolean DEFAULT true,
    usar_logo_sistema boolean DEFAULT true,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.envios_correo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id uuid REFERENCES public.eventos(id),
    persona_id uuid REFERENCES public.personas(id),
    inscripcion_id uuid REFERENCES public.inscripciones(id),
    plantilla_id uuid REFERENCES public.plantillas_correo(id),
    asunto_real text,
    estado text DEFAULT 'pendiente', -- pendiente, enviado, fallido
    error_mensaje text,
    proveedor_id text, -- ID de n8n o similar
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    sent_at timestamptz
);

-- 2. Funciones de Ayuda
CREATE OR REPLACE FUNCTION public.obtener_configuracion_correo_sistema_activa()
RETURNS SETOF public.configuracion_correo_sistema
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT * FROM public.configuracion_correo_sistema
    WHERE activo = true
    ORDER BY created_at DESC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.validar_envio_correo_evento(
    p_evento_id uuid,
    p_persona_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscrito boolean;
    v_has_template boolean;
BEGIN
    -- Verificar si existe el evento y tiene plantilla o override
    SELECT (plantilla_correo_id IS NOT NULL OR mensaje_correo_html IS NOT NULL)
    INTO v_has_template
    FROM public.eventos
    WHERE id = p_evento_id;

    IF NOT v_has_template THEN
        RETURN jsonb_build_object('success', false, 'error', 'El evento no tiene configurada una plantilla de correo.');
    END IF;

    -- Verificar si la persona está inscrita
    SELECT EXISTS (
        SELECT 1 FROM public.inscripciones 
        WHERE evento_id = p_evento_id AND persona_id = p_persona_id
    ) INTO v_inscrito;

    IF NOT v_inscrito THEN
        RETURN jsonb_build_object('success', false, 'error', 'La persona no está inscrita en este evento.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_contexto_correo_evento(p_inscripcion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'participante', jsonb_build_object(
            'id', p.id,
            'nombres', p.nombres,
            'apellidos', p.apellidos,
            'nombre_completo', p.nombre_completo,
            'correo', p.correo,
            'tipo_documento', p.tipo_documento,
            'numero_documento', p.numero_documento
        ),
        'evento', jsonb_build_object(
            'id', e.id,
            'titulo', e.titulo,
            'fecha_periodo', e.fecha_periodo,
            'lugar', e.lugar,
            'asunto_override', e.asunto_correo,
            'mensaje_override', e.mensaje_correo_html
        ),
        'sistema', (SELECT jsonb_build_object(
            'nombre_remitente', c.nombre_remitente,
            'email_respuesta', c.email_respuesta,
            'logo_url', c.logo_url,
            'firma_html', c.firma_html,
            'footer_html', c.footer_html,
            'telefono_contacto', c.telefono_contacto,
            'email_contacto', c.email_contacto,
            'sitio_web', c.sitio_web
        ) FROM public.obtener_configuracion_correo_sistema_activa() c),
        'respuestas', (SELECT jsonb_object_agg(f.nombre_campo, r.valor)
                      FROM public.respuestas_formulario resp,
                           jsonb_each_text(resp.respuesta_json) r(key, valor)
                      JOIN public.formulario_campos f ON f.id::text = r.key
                      WHERE resp.inscripcion_id = p_inscripcion_id)
    )
    INTO v_result
    FROM public.inscripciones i
    JOIN public.personas p ON p.id = i.persona_id
    JOIN public.eventos e ON e.id = i.evento_id
    WHERE i.id = p_inscripcion_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_resultado_envio_correo(
    p_inscripcion_id uuid,
    p_evento_id uuid,
    p_persona_id uuid,
    p_estado text,
    p_error_mensaje text DEFAULT NULL,
    p_proveedor_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.envios_correo (
        inscripcion_id,
        evento_id,
        persona_id,
        estado,
        error_mensaje,
        proveedor_id,
        sent_at
    )
    VALUES (
        p_inscripcion_id,
        p_evento_id,
        p_persona_id,
        p_estado,
        p_error_mensaje,
        p_proveedor_id,
        CASE WHEN p_estado = 'enviado' THEN now() ELSE NULL END
    );
END;
$$;
