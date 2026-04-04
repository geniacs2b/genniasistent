import { createClient } from '@/lib/supabaseServer';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';
import { getBogotaDateTime } from '@/lib/date';

export interface TenantPublicBranding {
  name: string;
  logo_url: string | null;
  public_header_bg_color: string | null;
  public_header_bg_secondary: string | null;
}

type Evento = Database['public']['Tables']['eventos']['Row'];

export const eventService = {
  /**
   * Obtiene todos los eventos activos
   */
  async getActiveEvents(): Promise<Evento[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('activo', true)
      .order('fecha_inicio', { ascending: false });

    if (error) {
      console.error('Error fetching active events:', error);
      throw new Error('No se pudieron obtener los eventos activos.');
    }

    return data;
  },

  /**
   * Obtiene un evento por su id
   */
  async getEventById(id: string): Promise<Evento> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error(`Error fetching event by id ${id}:`, error);
      throw new Error('Evento no encontrado.');
    }

    return data;
  },

  /**
   * Obtiene un evento basándose en el slug de su formulario asociado, incluyendo metadatos de disponibilidad
   * y branding público del tenant propietario.
   */
  async getEventByFormSlug(slug: string): Promise<{
    evento: Evento;
    formularioId: string;
    fecha_apertura: string | null;
    fecha_cierre: string | null;
    tenantBranding: TenantPublicBranding | null;
  }> {
    const supabase = createClient();

    // 1. Buscar el formulario por slug
    const { data: form, error: formError } = await supabase
      .from('formularios')
      .select('id, evento_id, fecha_apertura, fecha_cierre')
      .eq('slug', slug)
      .single();

    if (formError || !form) {
      console.error(`Error fetching form by slug ${slug}:`, formError);
      throw new Error('Formulario no encontrado.');
    }

    // 2. Obtener el evento por id
    const evento = await this.getEventById(form.evento_id);

    // 3. Construir disponibilidad
    const aperturaCalc = form.fecha_apertura || getBogotaDateTime(evento.fecha_inicio, evento.hora_inicio)?.toISOString();
    const cierreCalc   = form.fecha_cierre   || getBogotaDateTime(evento.fecha_fin,   evento.hora_fin)?.toISOString();

    // 4. Obtener branding público del tenant (usando service role para evitar problemas de RLS en contexto público)
    let tenantBranding: TenantPublicBranding | null = null;
    try {
      const tenantId = (evento as any).tenant_id as string | undefined;
      if (tenantId) {
        const serviceSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { cookies: { get() { return undefined; } } }
        );
        const { data: tenantData } = await serviceSupabase
          .from('tenants')
          .select('name, logo_url, public_header_bg_color, public_header_bg_secondary')
          .eq('id', tenantId)
          .single();

        if (tenantData) {
          tenantBranding = {
            name:                       tenantData.name,
            logo_url:                   tenantData.logo_url ?? null,
            public_header_bg_color:     (tenantData as any).public_header_bg_color ?? null,
            public_header_bg_secondary: (tenantData as any).public_header_bg_secondary ?? null,
          };
        }
      }
    } catch {
      // Branding is optional — never fail the whole page for it
    }

    return {
      evento,
      formularioId:  form.id,
      fecha_apertura: aperturaCalc || null,
      fecha_cierre:   cierreCalc   || null,
      tenantBranding,
    };
  },

  /**
   * Elimina un evento completo usando RPC
   */
  async deleteEventComplete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('eliminar_evento_completo', { 
      p_evento_id: id 
    });
    if (error) throw new Error(error.message);
  }
};
