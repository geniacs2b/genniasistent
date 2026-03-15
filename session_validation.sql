-- Trigger para validar que la fecha de la sesión esté dentro del rango del evento
CREATE OR REPLACE FUNCTION public.validar_fecha_sesion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fecha_inicio date;
    v_fecha_fin date;
BEGIN
    -- Obtener el rango de fechas del evento
    SELECT fecha_inicio, fecha_fin INTO v_fecha_inicio, v_fecha_fin
    FROM public.eventos
    WHERE id = NEW.evento_id;

    -- Validar si el evento tiene fechas definidas
    IF v_fecha_inicio IS NULL OR v_fecha_fin IS NULL THEN
        RAISE EXCEPTION 'El evento debe tener fechas de inicio y fin definidas antes de crear sesiones.';
    END IF;

    -- Validar que la fecha de la sesión esté en el rango
    IF NEW.fecha < v_fecha_inicio OR NEW.fecha > v_fecha_fin THEN
        RAISE EXCEPTION 'La fecha de la sesión (%) está fuera del rango del evento (% al %).', 
            NEW.fecha, v_fecha_inicio, v_fecha_fin;
    END IF;

    RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_validar_fecha_sesion ON public.sesiones_evento;
CREATE TRIGGER trigger_validar_fecha_sesion
BEFORE INSERT OR UPDATE ON public.sesiones_evento
FOR EACH ROW
EXECUTE FUNCTION public.validar_fecha_sesion();
