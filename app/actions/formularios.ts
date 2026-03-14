"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function createFormulario(eventoId: string, campos: any[] = []) {
  // Cliente directo para saltar problemas de cookies() en el diagnóstico
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  console.log("Iniciando creación de formulario para evento:", eventoId);

  // 1. Obtener datos del evento
  const { data: evento, error: evError } = await supabase
    .from("eventos")
    .select("titulo")
    .eq("id", eventoId)
    .single();

  if (evError) {
    console.error("Error al obtener evento:", evError);
    throw new Error(`Error al obtener evento: ${evError.message}`);
  }

  // 2. Insertar formulario base
  const slugBase = (evento?.titulo || 'nuevo-evento').toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const { data: form, error: formError } = await supabase.from("formularios").insert({
    evento_id: eventoId,
    nombre: `Inscripción - ${evento?.titulo || 'nuevo evento'}`,
    slug: `${slugBase}-${Date.now()}`,
    descripcion: `Formulario de inscripción para ${evento?.titulo || 'nuevo evento'}`,
    activo: true
  }).select('id').single();

  if (formError) {
    console.error("Error al insertar formulario:", formError);
    throw new Error(`Error al crear base del formulario: ${formError.message}`);
  }

  if (!form) {
    throw new Error("No se recibió respuesta del servidor al crear el formulario.");
  }

  // 3. Insertar campos si existen
  if (campos.length > 0) {
    console.log(`Insertando ${campos.length} campos para formulario ${form.id}`);
    const camposMapped = campos.map((c, i) => ({
      formulario_id: form.id,
      nombre_campo: (c.label || `campo_${i}`).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
      label: c.label || `Campo ${i + 1}`,
      tipo_campo: c.tipo_campo || "text",
      obligatorio: c.obligatorio ?? false,
      opciones_json: c.opciones || null, // Guardamos opciones del preset si existen
      orden: i,
    }));

    const { error: camposError } = await supabase.from("formulario_campos").insert(camposMapped);
    if (camposError) {
      console.error("Error al insertar campos:", camposError);
      throw new Error(`Error al insertar campos del formulario: ${camposError.message}`);
    }
  }

  console.log("Formulario creado con éxito para evento:", eventoId);
  revalidatePath("/admin/formularios");
}

export async function deleteFormulario(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("formularios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/formularios");
}

