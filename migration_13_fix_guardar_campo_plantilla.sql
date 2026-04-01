-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 13 — Corregir guardar_campo_plantilla_evento
--
-- Causa raíz:
--   PostgREST resuelve llamadas con parámetros nombrados buscando la función
--   cuya firma coincide EXACTAMENTE con el conjunto de parámetros recibidos.
--   La versión desplegada en producción tenía una firma más corta (sin los
--   parámetros tipográficos: p_font_family, p_font_weight, p_color,
--   p_line_height, p_letter_spacing, p_auto_fit).
--   CREATE OR REPLACE no puede cambiar la lista de parámetros de una función
--   existente → hay que hacer DROP + CREATE.
--
-- Qué hace esta migración:
--   1. Elimina TODAS las sobrecargas de guardar_campo_plantilla_evento
--   2. Crea la versión canónica con los 17 parámetros que envía el frontend
--   3. Incluye NOTIFY para forzar recarga del schema cache de PostgREST
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Eliminar todas las sobrecargas previas (sin importar su firma actual)
DROP FUNCTION IF EXISTS public.guardar_campo_plantilla_evento(uuid,text,text,numeric,numeric,numeric,numeric,text);
DROP FUNCTION IF EXISTS public.guardar_campo_plantilla_evento(uuid,text,text,numeric,numeric,numeric,numeric,text,integer,boolean,integer);
DROP FUNCTION IF EXISTS public.guardar_campo_plantilla_evento(uuid,text,text,numeric,numeric,numeric,numeric,text,integer,boolean,integer,text,text,text,numeric,numeric,boolean);

-- Por si hay otras variantes desconocidas, el nombre se borra en cascada:
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'guardar_campo_plantilla_evento'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;


-- 2. Crear la versión canónica con todos los parámetros tipográficos
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
    v_plantilla_id uuid;
    v_campo_id     uuid;
BEGIN
    -- Resolver plantilla_certificado_id desde el evento
    SELECT plantilla_certificado_id
    INTO   v_plantilla_id
    FROM   public.eventos
    WHERE  id = p_evento_id;

    IF v_plantilla_id IS NULL THEN
        RAISE EXCEPTION 'El evento % no tiene una plantilla de certificado asociada.', p_evento_id;
    END IF;

    -- Upsert del campo
    INSERT INTO public.plantilla_campos_certificado (
        plantilla_certificado_id,
        tipo_campo,    etiqueta,
        pos_x,         pos_y,
        width,         height,
        text_align,    font_size,
        visible,       orden,
        font_family,   font_weight,
        color,         line_height,
        letter_spacing, auto_fit
    )
    VALUES (
        v_plantilla_id,
        p_tipo_campo,    p_etiqueta,
        p_posicion_x,    p_posicion_y,
        p_ancho_caja,    p_alto_caja,
        p_text_align,    p_font_size,
        p_visible,       p_orden,
        p_font_family,   p_font_weight,
        p_color,         p_line_height,
        p_letter_spacing, p_auto_fit
    )
    ON CONFLICT (plantilla_certificado_id, tipo_campo) DO UPDATE
    SET
        etiqueta        = EXCLUDED.etiqueta,
        pos_x           = EXCLUDED.pos_x,
        pos_y           = EXCLUDED.pos_y,
        width           = EXCLUDED.width,
        height          = EXCLUDED.height,
        text_align      = EXCLUDED.text_align,
        font_size       = EXCLUDED.font_size,
        visible         = EXCLUDED.visible,
        orden           = EXCLUDED.orden,
        font_family     = EXCLUDED.font_family,
        font_weight     = EXCLUDED.font_weight,
        color           = EXCLUDED.color,
        line_height     = EXCLUDED.line_height,
        letter_spacing  = EXCLUDED.letter_spacing,
        auto_fit        = EXCLUDED.auto_fit,
        updated_at      = now()
    RETURNING id INTO v_campo_id;

    RETURN v_campo_id;
END;
$$;

COMMENT ON FUNCTION public.guardar_campo_plantilla_evento IS
  'Upsert de un campo de plantilla de certificado.
   Parámetros tipográficos: font_family, font_weight, color, line_height, letter_spacing, auto_fit.
   Requiere que el evento tenga plantilla_certificado_id asignado.';


-- 3. Notificar a PostgREST para que recargue el schema cache inmediatamente
--    (equivale a presionar "Reload schema" en el Dashboard → API)
NOTIFY pgrst, 'reload schema';
