"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

/**
 * Crea una plantilla de certificado y la asocia al evento.
 * Propaga tenant_id explícitamente desde el usuario autenticado.
 */
export async function createPlantillaCertificado(data: {
  evento_id: string;
  nombre: string;
  archivo_base_url: string;
  ancho_px: number;
  alto_px: number;
}) {
  const supabase = createClient();

  // Obtener tenant_id del usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) throw new Error("No se pudo identificar el tenant del usuario.");

  // 1. Insertar plantilla con tenant_id explícito
  const { data: tmpl, error: dbErr } = await supabase
    .from("plantillas_certificado")
    .insert({
      nombre: data.nombre,
      archivo_base_url: data.archivo_base_url,
      ancho_px: data.ancho_px,
      alto_px: data.alto_px,
      activo: true,
      tenant_id: tenantId,  // ← EXPLÍCITO
    })
    .select()
    .single();

  if (dbErr) throw new Error(dbErr.message);

  // 2. Asociar plantilla al evento (RLS garantiza que el evento es del mismo tenant)
  const { error: eventErr } = await supabase
    .from("eventos")
    .update({ plantilla_certificado_id: tmpl.id })
    .eq("id", data.evento_id);

  if (eventErr) throw new Error(eventErr.message);

  revalidatePath("/app/plantillas");
  return tmpl;
}
