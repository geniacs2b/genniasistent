import { createClient } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

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
   */
  async getEventByFormSlug(slug: string): Promise<{ evento: Evento, formularioId: string, fecha_apertura: string | null, fecha_cierre: string | null }> {
    const supabase = createClient();
    
    // 1. Buscar el formulario por slug para obtener evento_id y fechas
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

    return {
      evento,
      formularioId: form.id,
      fecha_apertura: form.fecha_apertura,
      fecha_cierre: form.fecha_cierre
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
