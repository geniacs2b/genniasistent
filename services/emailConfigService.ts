import { createClient } from "@/lib/supabaseServer";

export const emailConfigService = {
  /**
   * Obtiene la configuración institucional activa
   */
  async getSystemConfig() {
    const supabase = createClient();
    // Consulta directa con select('*') para garantizar que siempre se retornan
    // todas las columnas, incluyendo las agregadas posteriormente (colores, toggles, etc.).
    // El RPC anterior no se actualiza automáticamente al agregar columnas a la tabla.
    const { data } = await supabase
      .from('configuracion_correo_sistema')
      .select('*')
      .eq('activo', true)
      .limit(1)
      .single();
    return data;
  },

  /**
   * Guarda o actualiza la configuración institucional
   */
  async saveSystemConfig(config: any) {
    const supabase = createClient();
    const { id, ...rest } = config;
    
    if (id) {
       const { error } = await supabase
         .from('configuracion_correo_sistema')
         .update({ ...rest, updated_at: new Date().toISOString() })
         .eq('id', id);
       if (error) throw error;
    } else {
       const { error } = await supabase
         .from('configuracion_correo_sistema')
         .insert({ ...rest, activo: true });
       if (error) throw error;
    }
  },

  /**
   * Obtiene todas las plantillas de correo
   */
  async getEmailTemplates() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plantillas_correo')
      .select('*')
      .order('nombre_plantilla', { ascending: true });
    if (error) throw error;
    return data;
  },

  /**
   * Crea o actualiza una plantilla de correo
   */
  async saveEmailTemplate(template: any) {
    const supabase = createClient();
    const { id, ...rest } = template;
    
    if (id) {
      const { data, error } = await supabase
        .from('plantillas_correo')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('plantillas_correo')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  /**
   * Elimina una plantilla de correo
   */
  async deleteEmailTemplate(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('plantillas_correo')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Valida si se puede enviar un correo
   */
  async validateEmailSend(eventoId: string, personaId: string, tipoEnvio: string = 'certificado') {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('validar_envio_correo_evento', {
      p_evento_id: eventoId,
      p_persona_id: personaId,
      p_tipo_envio: tipoEnvio
    });
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene el contexto completo para un envío
   */
  async getEmailContext(eventoId: string, personaId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('obtener_contexto_correo_evento', {
      p_evento_id: eventoId,
      p_persona_id: personaId
    });
    if (error) throw error;
    return data;
  },

  /**
   * Obtiene el historial de envíos para un inscrito
   */
  async getEmailHistory(eventoId: string, personaId: string, tipoEnvio: string = 'certificado') {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('obtener_historial_envio_correo', {
      p_evento_id: eventoId,
      p_persona_id: personaId,
      p_tipo_envio: tipoEnvio
    });
    // Si no hay RPC, fallback a consulta directa
    if (error) {
       const { data: directData } = await supabase
         .from('envios_correo')
         .select('*')
         .eq('evento_id', eventoId)
         .eq('persona_id', personaId)
         .eq('tipo_envio', tipoEnvio)
         .order('enviado_at', { ascending: false });
       return directData || [];
    }
    return data;
  }
};
