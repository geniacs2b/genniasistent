import { createClient } from '@/lib/supabaseServer';

export const emailVerificationService = {
  /**
   * Verifica un token de correo electrónico usando el RPC
   */
  async verifyToken(token: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('verificar_correo_inscripcion', {
      p_token: token.trim()
    });

    if (error) {
      console.error("Error Email Verification RPC:", error);
      throw new Error(error.message);
    }
    
    return data; 
  },

  /**
   * Reenvía el token de verificación usando el persona_id
   */
  async resendVerificationPorPersona(personaId: string, eventoId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase.rpc('reenviar_verificacion_por_persona', {
      p_persona_id: personaId,
      p_evento_id: eventoId,
      p_minutos_expiracion: 60
    });

    if (error) {
      console.error("Error Resend Verification RPC:", error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Obtiene el estado actual de la inscripción para polling usando personaId
   */
  async getVerificationStatus(personaId: string, eventoId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('inscripciones')
      .select('estado')
      .eq('persona_id', personaId)
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[EmailVerificationService] Error fetching status:", error);
      return null;
    }

    return data ? { estado: data.estado } : null;
  }
};
