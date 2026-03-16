import { createClient } from '@/lib/supabaseServer';
import { formatToBogota, isAvailable } from '@/lib/date';
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
      const { available, isBefore, isAfter } = isAvailable(form.fecha_apertura, form.fecha_cierre);
      
      if (isBefore) {
        throw new Error(`Las inscripciones aún no han abierto (Abre el ${formatToBogota(form.fecha_apertura)})`);
      }
      if (isAfter) {
        throw new Error(`Las inscripciones para este evento ya cerraron.`);
      }
    }

    // 2. Ejecutar registro mediante RPC con parámetros separados
    console.log(`[RegistrationService] Llamando RPC registrar_inscripcion_evento con:`, {
      p_correo: values.correo?.trim().toLowerCase(),
      p_numero_documento: values.numero_documento,
      p_evento_id: eventoId
    });

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
      console.error("[RegistrationService] ERROR crítico en RPC registrar_inscripcion_evento:", error);
      throw new Error(error.message || 'Ocurrió un error en el registro.');
    }
    
    console.log(`[RegistrationService] RPC éxito. ID Inscripción: ${data?.inscripcion_id}`);
    return {
      success: data.success,
      persona_id: data.persona_id,
      inscripcion_id: data.inscripcion_id,
      token_verificacion: data.token_verificacion,
      error: data.error
    };
  },

  /**
   * Actualiza una inscripción pendiente usando el persona_id
   */
  async updateRegistrationPorPersona(personaId: string, eventoId: string, formularioId: string, values: any) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('actualizar_registro_pendiente_por_persona', {
      p_persona_id: personaId,
      p_evento_id: eventoId,
      p_formulario_id: formularioId,
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
      p_minutos_expiracion: 60
    });

    if (error) {
      console.error("[RegistrationService] Error en actualizar_registro_pendiente_por_persona:", error);
      throw new Error(error.message);
    }

    return {
      success: data.success,
      persona_id: data.persona_id,
      inscripcion_id: data.inscripcion_id,
      token_verificacion: data.token_verificacion,
      error: data.error
    };
  },

  /**
   * Cancela una inscripción pendiente usando el persona_id
   */
  async cancelRegistrationPorPersona(personaId: string, eventoId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('cancelar_registro_pendiente_por_persona', {
      p_persona_id: personaId,
      p_evento_id: eventoId
    });

    if (error) {
      console.error("[RegistrationService] Error en cancelar_registro_pendiente_por_persona:", error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Obtiene los datos de una inscripción para pre-llenado (si existiera)
   */
  async getRegistrationData(eventoId: string, doc?: string, type?: string, personaId?: string) {
    const supabase = createClient();
    
    let query = supabase
      .from('inscripciones')
      .select(`
        id,
        estado,
        personas!inner (
          id, nombres, apellidos, correo, telefono, empresa, cargo, municipio, departamento, tratamiento_datos_aceptado, numero_documento, tipo_documento
        ),
        respuestas_formulario (
          respuesta_json
        )
      `)
      .eq('evento_id', eventoId);

    if (personaId) {
      query = query.eq('persona_id', personaId);
    } else if (doc && type) {
      query = query
        .eq('personas.numero_documento', doc)
        .eq('personas.tipo_documento', type);
    } else {
      return null;
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[RegistrationService] Error fetching registration data:", error);
      return null;
    }

    if (!data) return null;

    return {
      inscripcion_id: data.id,
      estado: data.estado,
      persona: data.personas,
      respuestas: (data.respuestas_formulario as any)?.[0]?.respuesta_json || {}
    };
  }
};
