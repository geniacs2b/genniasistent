import { createClient } from '@/lib/supabaseServer';
import { Database } from '@/types/database.types';

type FormularioCampo = Database['public']['Tables']['formulario_campos']['Row'];

export const formService = {
  /**
   * Obtiene la estructura completa del formulario (campos) para un evento dado
   */
  async getFormStructureForEvent(eventoId: string): Promise<FormularioCampo[]> {
    const supabase = createClient();
    
    // Obtener configuración del formulario asociada al evento
    const { data: form, error: formError } = await supabase
      .from('formularios')
      .select('id')
      .eq('evento_id', eventoId)
      .single();

    if (formError || !form) {
      console.error('Error fetching form:', formError);
      throw new Error('Formulario no configurado para este evento.');
    }

    // Obtener campos definidos para ese formulario
    const { data: fields, error: fieldsError } = await supabase
      .from('formulario_campos')
      .select('*')
      .eq('formulario_id', form.id)
      .order('orden', { ascending: true });

    if (fieldsError) {
      console.error('Error fetching fields:', fieldsError);
      throw new Error('Error al cargar la estructura del formulario.');
    }

    return fields || [];
  }
};
