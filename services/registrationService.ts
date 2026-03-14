import { createClient } from '@/lib/supabaseServer';
import { formatToBogota } from '@/lib/date';
import { normalizePersonName } from '@/lib/string-utils';

export const registrationService = {
  /**
   * Ejecuta el proceso transaccional de inscripción llamando al RPC
   */
  async registerParticipant(formularioId: string, eventoId: string, values: any) {
    const supabase = createClient();
    
    // 1. Verificar disponibilidad temporal
    const { data: form, error: formError } = await supabase
      .from('formularios')
      .select('fecha_apertura, fecha_cierre')
      .eq('id', formularioId)
      .single();

    if (form && !formError) {
      const now = new Date();
      if (form.fecha_apertura && now < new Date(form.fecha_apertura)) {
        throw new Error(`Las inscripciones aún no han abierto (Abre el ${formatToBogota(form.fecha_apertura)})`);
      }
      if (form.fecha_cierre && now > new Date(form.fecha_cierre)) {
        throw new Error(`Las inscripciones para este evento ya cerraron.`);
      }
    }

    // 2. Ejecutar registro mediante RPC con parámetros separados
    const { data, error } = await supabase.rpc('registrar_inscripcion_evento', {
      p_formulario_id: formularioId,
      p_evento_id: eventoId,
      p_tipo_documento: values.tipo_documento,
      p_numero_documento: values.numero_documento,
      p_nombres: normalizePersonName(values.nombres),
      p_apellidos: normalizePersonName(values.apellidos),
      p_correo: values.correo?.trim().toLowerCase(),
      p_telefono: values.telefono || null,
      p_empresa: values.empresa || null,
      p_cargo: values.cargo || null,
      p_municipio: values.municipio || null,
      p_departamento: values.departamento || null,
      p_tratamiento_datos_aceptado: values.tratamiento_datos_aceptado || false,
      p_respuesta_json: values.p_respuesta_json || values,
      p_fuente: 'formulario_web',
      p_minutos_expiracion: 60
    });

    if (error) {
      console.error("Error Registration RPC:", error);
      throw new Error(error.message || 'Ocurrió un error en el registro.');
    }
    
    return data;
  }
};
