import { createClient } from '@/lib/supabaseClient';

export const attendanceService = {

  /** Genera un QR para una sesión (llama al RPC generar_qr_sesion) */
  async generateQrForSession(sesionId: string, observacion?: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('generar_qr_sesion', {
      p_sesion_evento_id: sesionId,
      p_observacion: observacion ?? null,
    });
    if (error) {
      console.error('Error generar_qr_sesion:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /** Activa un QR generado (llama al RPC activar_qr_sesion) */
  async activateQrToken(qrTokenId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('activar_qr_sesion', {
      p_qr_token_id: qrTokenId,
    });
    if (error) {
      console.error('Error activar_qr_sesion:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /** Desactiva un QR activo (llama al RPC desactivar_qr_sesion) */
  async deactivateQrToken(qrTokenId: string, desactivadoPor?: string, observacion?: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('desactivar_qr_sesion', {
      p_qr_token_id: qrTokenId,
      p_desactivado_por: desactivadoPor ?? null,
      p_observacion: observacion ?? null,
    });
    if (error) {
      console.error('Error desactivar_qr_sesion:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /** Cancela un QR (llama al RPC cancelar_qr_sesion) */
  async cancelQrToken(qrTokenId: string, observacion?: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('cancelar_qr_sesion', {
      p_qr_token_id: qrTokenId,
      p_observacion: observacion ?? null,
    });
    if (error) {
      console.error('Error cancelar_qr_sesion:', error);
      throw new Error(error.message);
    }
    return data;
  },

  /** Valida si un token QR está activo (llama al RPC validar_qr_asistencia) */
  async validateQrToken(token: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('validar_qr_asistencia', {
      p_token: token,
    });
    if (error) {
      console.error('Error validar_qr_asistencia:', error);
      throw new Error(error.message);
    }
    return Array.isArray(data) ? data[0] : data;
  },

  /** Registra asistencia por número de documento (llama al RPC registrar_asistencia_por_qr) */
  async registerAttendanceByDocument(token: string, numeroDocumento: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('registrar_asistencia_por_qr', {
      p_token: token,
      p_numero_documento: numeroDocumento,
    });
    if (error) {
      console.error('Error registrar_asistencia_por_qr:', error);
      throw new Error(error.message);
    }
    return Array.isArray(data) ? data[0] : data;
  },

  /** Obtiene sesiones de un evento con su QR asociado */
  async getSessionsByEvent(eventoId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sesiones_evento')
      .select('id, nombre, fecha, hora_inicio, hora_fin, qr_tokens_asistencia(id, token, estado, activo, fecha_activacion, fecha_desactivacion)')
      .eq('evento_id', eventoId)
      .order('fecha', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** Cuenta asistencias de una sesión */
  async getSessionAttendanceSummary(sesionId: string) {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('asistencias')
      .select('id', { count: 'exact', head: true })
      .eq('sesion_id', sesionId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
};
