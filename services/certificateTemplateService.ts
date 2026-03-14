import { createClient } from '@/lib/supabaseClient';

export const certificateTemplateService = {
  /**
   * Sube un PNG al bucket 'certificados-base' y crea el registro en plantillas_certificado
   */
  async uploadTemplate(file: File, nombre: string, describcion?: string) {
    const supabase = createClient();
    const fileName = `${Date.now()}_${file.name}`;

    // 1. Subir archivo a storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificados-base')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('certificados-base')
      .getPublicUrl(fileName);

    // 3. Leer dimensiones desde el cliente (no disponible server-side sin sharp)
    // El cliente debe pasar width/height como parámetros
    const { data: template, error: dbError } = await supabase
      .from('plantillas_certificado')
      .insert({
        nombre,
        descripcion: describcion || null,
        archivo_base_url: publicUrl,
        // ancho_px y alto_px se actualizan desde el cliente después de detectar con Image()
        ancho_px: 0,
        alto_px: 0,
        activo: true,
      })
      .select()
      .single();

    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    return template;
  },

  /**
   * Actualiza las dimensiones de una plantilla
   */
  async updateDimensions(id: string, width: number, height: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from('plantillas_certificado')
      .update({ ancho_px: width, alto_px: height })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  /**
   * Guarda la configuración de un campo del editor visual vinculándolo al evento
   */
  async saveFieldConfig(eventoId: string, campo: any) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('guardar_campo_plantilla_evento', {
      p_evento_id: eventoId,
      p_tipo_campo: campo.tipo_campo,
      p_etiqueta: campo.etiqueta,
      p_posicion_x: campo.pos_x,
      p_posicion_y: campo.pos_y,
      p_ancho_caja: campo.width,
      p_alto_caja: campo.height,
      p_text_align: campo.text_align,
      p_font_size: campo.font_size,
      p_visible: campo.visible ?? true,
      p_orden: campo.orden ?? 0
    });

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Obtiene todas las plantillas
   */
  async getTemplates() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plantillas_certificado')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async getFieldConfig(plantillaId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plantilla_campos_certificado')
      .select('*')
      .eq('plantilla_certificado_id', plantillaId)
      .order('orden', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /**
   * Elimina una plantilla usando RPC
   */
  async deleteTemplate(id: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('eliminar_plantilla_certificado', { 
      p_plantilla_id: id 
    });
    if (error) throw new Error(error.message);
  }
};
