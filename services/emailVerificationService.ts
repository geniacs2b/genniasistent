import { createClient } from '@/lib/supabaseServer';

export const emailVerificationService = {
  /**
   * Verifica un token de correo electrónico usando el RPC
   */
  async verifyToken(token: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('verificar_correo_inscripcion', {
      p_token: token
    });

    if (error) {
      console.error("Error Email Verification RPC:", error);
      throw new Error(error.message);
    }
    
    // El RPC al parecer devuelve un array con un objeto: [{ ok: boolean, mensaje: string, ... }]
    return Array.isArray(data) ? data[0] : data; 
  },

  /**
   * Actualiza el correo y reenvía el token de verificación
   */
  async correctEmail(numeroDocumento: string, tipoDocumento: string, nuevoCorreo: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('actualizar_correo_y_reenviar_verificacion', {
      p_numero_documento: numeroDocumento,
      p_tipo_documento: tipoDocumento,
      p_nuevo_correo: nuevoCorreo.trim().toLowerCase()
    });

    if (error) {
      console.error("Error Email Correction RPC:", error);
      throw new Error(error.message);
    }

    return data; // { exito, nuevo_token }
  }
};
