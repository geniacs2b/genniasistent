"use server";

import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function createSesion(data: {
  evento_id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
}) {
  const supabase = createClient();

  // Obtener tenant_id del usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) throw new Error("No se pudo identificar el tenant del usuario.");

  const { error } = await supabase.from("sesiones_evento").insert({
    evento_id: data.evento_id,
    nombre: data.nombre,
    fecha: data.fecha || null,
    hora_inicio: data.hora_inicio || null,
    hora_fin: data.hora_fin || null,
    tenant_id: tenantId,  // ← EXPLÍCITO
  });

  if (error) throw new Error(error.message);

  revalidatePath("/app/sesiones");
}
