"use server";

import { createClient } from "@/lib/supabaseServer";

/**
 * Verifica si una persona con el número de documento dado ya está inscrita en un evento específico.
 */
export async function checkExistingRegistration(eventoId: string, numeroDocumento: string) {
  try {
    const supabase = createClient();

    // 1. Buscar la persona por su número de documento
    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("id")
      .eq("numero_documento", numeroDocumento?.trim())
      .maybeSingle();

    if (personaError) throw personaError;
    if (!persona) return { exists: false };

    // 2. Verificar si esa persona ya tiene una inscripción para el evento dado
    const { data: inscripcion, error: inscError } = await supabase
      .from("inscripciones")
      .select("id")
      .eq("evento_id", eventoId)
      .eq("persona_id", persona.id)
      .maybeSingle();

    if (inscError) throw inscError;

    return { exists: !!inscripcion };
  } catch (error: any) {
    console.error("Error validating registration uniqueness:", error);
    return { error: error.message };
  }
}
