import { createClient } from '@/lib/supabaseServer';

export const adminDashboardService = {
  async getDashboardMetrics() {
    const supabase = createClient();
    
    // We get the tenant ID from the session first to assure proper filtering
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id;

    if (!tenantId) {
        return { totalEventos: 0, certificadosEmitidos: 0, cuotaDisponible: 0, billingStatus: 'trial', lotesRecientes: [], errores: 0, correoConectado: false };
    }

    const [
      { count: eventosCount },
      { count: emitidosCount },
      { data: tenantData },
      { count: configuracionesCorreo },
      { data: lotesData }
    ] = await Promise.all([
      supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('certificate_jobs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['generated', 'sent']),
      supabase.from('tenants').select('certificate_quota, billing_status').eq('id', tenantId).single(),
      supabase.from('email_configurations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true),
      supabase.from('certificate_batches').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5)
    ]);

    // Calcular errores recientes
    const { count: erroresRecientes } = await supabase.from('certificate_jobs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'failed');

    return {
      totalEventos: eventosCount || 0,
      certificadosEmitidos: emitidosCount || 0,
      cuotaDisponible: tenantData?.certificate_quota || 0,
      billingStatus: tenantData?.billing_status || 'trial',
      correoConectado: (configuracionesCorreo && configuracionesCorreo > 0) ? true : false,
      lotesRecientes: lotesData || [],
      errores: erroresRecientes || 0
    };
  }
};
