-- ACTUALIZACIÓN DE RPC PARA VALIDACIÓN DE QR CON DATOS DE EVENTO Y SESIÓN
-- Este script asegura que el frontend reciba toda la información necesaria para el bloque contextual.

CREATE OR REPLACE FUNCTION public.validar_qr_asistencia(p_token text)
RETURNS TABLE (
    token_id uuid,
    sesion_id uuid,
    sesion_nombre text,
    sesion_fecha date,
    evento_id uuid,
    evento_titulo text,
    token_activo boolean,
    estado_qr text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as token_id,
        s.id as sesion_id,
        s.nombre as sesion_nombre,
        s.fecha as sesion_fecha,
        e.id as evento_id,
        e.titulo as evento_titulo,
        q.activo as token_activo,
        q.estado as estado_qr
    FROM public.qr_tokens_asistencia q
    JOIN public.sesiones_evento s ON q.sesion_id = s.id
    JOIN public.eventos e ON s.evento_id = e.id
    WHERE q.token = p_token;
END;
$$;
