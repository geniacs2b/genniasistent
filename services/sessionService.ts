import { createClient } from '@/lib/supabaseClient';

export const sessionService = {
  /**
   * Elimina una sesión usando RPC
   */
  async deleteSession(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('eliminar_sesion_evento', { 
      p_sesion_evento_id: id 
    });
    console.log('RPC eliminar_sesion_evento result:', { data, error, id });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Obtiene sesiones (proxy de la lógica actual si fuera necesario centralizarlo)
   */
  async getSessions() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sesiones_evento")
      .select(`id, nombre, fecha, hora_inicio, hora_fin, eventos(id, titulo), qr_tokens_asistencia(id, token, estado, activo)`)
      .order("fecha", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
};
