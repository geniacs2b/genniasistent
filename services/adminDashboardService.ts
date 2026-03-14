import { createClient } from '@/lib/supabaseServer';

export const adminDashboardService = {
  /**
   * Obtiene las métricas generales para el dashboard
   */
  async getDashboardMetrics() {
    const supabase = createClient();
    
    const [
      { count: eventosCount, error: eventosError },
      { count: inscripcionesCount, error: inscripcionesError },
      { count: correosPendientes, error: pendientesError },
      { count: asistenciasCount, error: asistenciasError }
    ] = await Promise.all([
      supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('inscripciones').select('*', { count: 'exact', head: true }),
      supabase.from('verificaciones_correo').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      supabase.from('asistencias').select('*', { count: 'exact', head: true })
    ]);

    if (eventosError || inscripcionesError || pendientesError || asistenciasError) {
      console.error('Error fetching dashboard metrics');
    }

    return {
      totalEventos: eventosCount || 0,
      totalInscritos: inscripcionesCount || 0,
      correosPendientes: correosPendientes || 0,
      totalAsistencias: asistenciasCount || 0
    };
  }
};
