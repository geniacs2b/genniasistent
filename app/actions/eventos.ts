"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { fromBogotaLocal } from "@/lib/date";

export async function createEvento(formData: FormData) {
  const supabase = createClient();
  const fechaInicioRaw = formData.get("fecha_inicio") as string;
  const fechaFinRaw = formData.get("fecha_fin") as string;

  const horaInicio = fechaInicioRaw?.includes('T') ? fechaInicioRaw.split('T')[1] : null;
  const horaFin = fechaFinRaw?.includes('T') ? fechaFinRaw.split('T')[1] : null;

  const { data, error } = await supabase.from("eventos").insert({
    titulo: formData.get("titulo") as string,
    descripcion: formData.get("descripcion") as string,
    fecha_inicio: fromBogotaLocal(fechaInicioRaw) || null,
    fecha_fin: fromBogotaLocal(fechaFinRaw) || null,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    modalidad: formData.get("modalidad") as string,
    lugar: formData.get("lugar") as string,
    cupo_maximo: formData.get("cupo_maximo") ? Number(formData.get("cupo_maximo")) : null,
    min_sesiones_certificado: formData.get("min_sesiones_certificado") ? Number(formData.get("min_sesiones_certificado")) : null,
    tipo_evento_id: formData.get("tipo_evento_id") as string,
    activo: true,
    imagen_formulario_path: formData.get("imagen_formulario_path") as string || null,
    imagen_formulario_alt: formData.get("imagen_formulario_alt") as string || null,
    mostrar_imagen_formulario: formData.get("mostrar_imagen_formulario") === "true",
    plantilla_correo_id: formData.get("plantilla_correo_id") as string || null,
    asunto_correo: formData.get("asunto_correo") as string || null,
    mensaje_correo_html: formData.get("mensaje_correo_html") as string || null,
  }).select().single();

  if (error) throw new Error(error.message);

  // Crear formulario automático para el evento
  await supabase.from("formularios").insert({
    evento_id: data.id,
    nombre: `Inscripción - ${data.titulo}`,
    slug: data.titulo.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now(),
    descripcion: `Formulario de inscripción para ${data.titulo}`
  });

  revalidatePath("/admin/eventos");
  revalidatePath("/admin/formularios");
}

export async function updateEvento(id: string, formData: FormData) {
  const supabase = createClient();
  const fechaInicioRaw = formData.get("fecha_inicio") as string;
  const fechaFinRaw = formData.get("fecha_fin") as string;

  const horaInicio = fechaInicioRaw?.includes('T') ? fechaInicioRaw.split('T')[1] : null;
  const horaFin = fechaFinRaw?.includes('T') ? fechaFinRaw.split('T')[1] : null;

  const { error } = await supabase.from("eventos").update({
    titulo: formData.get("titulo") as string,
    descripcion: formData.get("descripcion") as string,
    fecha_inicio: fromBogotaLocal(fechaInicioRaw) || null,
    fecha_fin: fromBogotaLocal(fechaFinRaw) || null,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    modalidad: formData.get("modalidad") as string,
    lugar: formData.get("lugar") as string,
    cupo_maximo: formData.get("cupo_maximo") ? Number(formData.get("cupo_maximo")) : null,
    min_sesiones_certificado: formData.get("min_sesiones_certificado") ? Number(formData.get("min_sesiones_certificado")) : null,
    tipo_evento_id: formData.get("tipo_evento_id") as string,
    activo: formData.get("activo") === "true",
    imagen_formulario_path: formData.get("imagen_formulario_path") as string || null,
    imagen_formulario_alt: formData.get("imagen_formulario_alt") as string || null,
    mostrar_imagen_formulario: formData.get("mostrar_imagen_formulario") === "true",
    plantilla_correo_id: formData.get("plantilla_correo_id") as string || null,
    asunto_correo: formData.get("asunto_correo") as string || null,
    mensaje_correo_html: formData.get("mensaje_correo_html") as string || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/eventos");
}
