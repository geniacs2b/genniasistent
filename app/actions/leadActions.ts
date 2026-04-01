"use server";

import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type LeadPlan = "starter" | "pro" | "enterprise";
export type LeadEstado = "nuevo" | "contactado" | "cerrado";

export type LeadFormData = {
  nombre: string;
  empresa?: string;
  email: string;
  whatsapp?: string;
  plan: LeadPlan;
  mensaje?: string;
  fuente?: string;
};

/** Inserta un lead. Usa service_role para que funcione desde formularios públicos (anon). */
export async function createLeadAction(data: LeadFormData): Promise<{ success: boolean; error?: string; message?: string }> {
  // ── Validación básica ──────────────────────────────────────────
  if (!data.nombre?.trim())
    return { success: false, error: "El nombre es obligatorio." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email?.trim() || !emailRegex.test(data.email.trim()))
    return { success: false, error: "Ingresa un correo electrónico válido." };

  const planesValidos: LeadPlan[] = ["starter", "pro", "enterprise"];
  if (!planesValidos.includes(data.plan))
    return { success: false, error: "Plan seleccionado no válido." };

  // ── Insertar en DB con service_role (bypasa RLS anon-insert) ───
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return undefined; } } }
  );

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      nombre:   data.nombre.trim(),
      empresa:  data.empresa?.trim()  || null,
      email:    data.email.trim().toLowerCase(),
      whatsapp: data.whatsapp?.trim() || null,
      plan:     data.plan,
      mensaje:  data.mensaje?.trim()  || null,
      fuente:   data.fuente           || "precios",
    })
    .select("id, nombre, email, plan")
    .single();

  if (error) {
    console.error("[Leads] Error al guardar lead:", error.message);
    return { success: false, error: "No pudimos guardar tu solicitud. Intenta de nuevo." };
  }

  console.log(`[Leads] Nuevo lead creado: ${lead.email} → plan ${lead.plan} (ID: ${lead.id})`);

  // ── Notificación opcional via webhook n8n ──────────────────────
  const webhookUrl = process.env.N8N_LEADS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id:  lead.id,
          nombre:   lead.nombre,
          email:    lead.email,
          plan:     lead.plan,
          empresa:  data.empresa || null,
          whatsapp: data.whatsapp || null,
          mensaje:  data.mensaje || null,
          fuente:   data.fuente || "precios",
        }),
      });
    } catch (e) {
      // No bloquear la respuesta si el webhook falla
      console.warn("[Leads] Webhook n8n no disponible (no crítico):", e);
    }
  }

  revalidatePath("/app/leads");
  return { success: true, message: "¡Gracias! Nuestro equipo te contactará a la brevedad." };
}

/** Actualiza el estado de gestión de un lead (nuevo → contactado → cerrado). */
export async function updateLeadEstadoAction(
  id: string,
  estado: LeadEstado
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado." };

  const { error } = await supabase
    .from("leads")
    .update({ estado })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/app/leads");
  return { success: true };
}
