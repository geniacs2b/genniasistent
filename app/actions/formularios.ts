"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function createFormulario(eventoId: string, campos: any[] = []) {
  // Usar el cliente autenticado del servidor (no anon)
  const supabase = createClient();

  // Obtener tenant_id del usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) throw new Error("No se pudo identificar el tenant del usuario.");

  // 1. Obtener datos del evento (RLS ya filtra por tenant)
  const { data: evento, error: evError } = await supabase
    .from("eventos")
    .select("titulo, tenant_id")
    .eq("id", eventoId)
    .single();

  if (evError) throw new Error(`Error al obtener evento: ${evError.message}`);

  // 2. Insertar formulario base con tenant_id explícito
  const slugBase = (evento?.titulo || 'nuevo-evento').toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const { data: form, error: formError } = await supabase.from("formularios").insert({
    evento_id: eventoId,
    nombre: `Inscripción - ${evento?.titulo || 'nuevo evento'}`,
    slug: `${slugBase}-${Date.now()}`,
    descripcion: `Formulario de inscripción para ${evento?.titulo || 'nuevo evento'}`,
    activo: true,
    tenant_id: tenantId,  // ← EXPLÍCITO
  }).select('id').single();

  if (formError) throw new Error(`Error al crear base del formulario: ${formError.message}`);
  if (!form) throw new Error("No se recibió respuesta del servidor al crear el formulario.");

  // 3. Insertar campos con tenant_id explícito
  if (campos.length > 0) {
    const camposMapped = campos.map((c, i) => ({
      formulario_id: form.id,
      nombre_campo: (c.label || `campo_${i}`).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      label: c.label || `Campo ${i + 1}`,
      tipo_campo: c.tipo_campo || "text",
      obligatorio: c.obligatorio ?? false,
      opciones_json: c.opciones || null,
      orden: i,
      tenant_id: tenantId,  // ← EXPLÍCITO
    }));

    const { error: camposError } = await supabase.from("formulario_campos").insert(camposMapped);
    if (camposError) throw new Error(`Error al insertar campos del formulario: ${camposError.message}`);
  }

  revalidatePath("/app/formularios");
}

export async function deleteFormulario(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("formularios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/formularios");
}

