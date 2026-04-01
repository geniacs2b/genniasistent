"use server"

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@/lib/supabaseServer"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function createTenantAction(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: "Usuario no autenticado." }
  }

  const name = formData.get("name") as string
  if (!name || name.trim() === "") {
    return { success: false, error: "El nombre de la empresa es obligatorio." }
  }

  // Use service role for database manipulation regarding Auth/Tenants 
  const serviceSupabase = createServerClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     {
        cookies: {
           get(name: string) { return undefined },
           set(name: string, value: string, options: any) { },
           remove(name: string, options: any) { }
        }
     }
  )

  try {
    // 1. Create the tenant (trial defaults: 5 certs, no paid plan)
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from("tenants")
      .insert({
        name:              name.trim(),
        certificate_quota: 5,
        billing_status:    "trial",
        current_plan_key:  null,
      })
      .select()
      .single()

    if (tenantError) throw new Error(tenantError.message)

    // 2. Link user as owner
    const { error: linkError } = await serviceSupabase
      .from("tenant_users")
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "owner"
      })

    if (linkError) throw new Error(linkError.message)

    // 3. Update User app_metadata in Auth (crucial for middleware bypassing)
    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
      user.id,
      { app_metadata: { tenant_id: tenant.id } }
    )

    if (updateError) throw new Error(updateError.message)

    return { success: true, message: "Empresa creada exitosamente.", tenant_id: tenant.id }

  } catch (err: any) {
    console.error("Error creando tenant:", err)
    return { success: false, error: err.message || "Fallo intrapolado interno al crear el espacio."}
  }
}

/**
 * Actualiza los datos básicos del tenant del usuario autenticado.
 * Usa service_role para evitar dependencia de política RLS UPDATE en tenants.
 */
export async function updateTenantAction(data: {
  name: string;
  domain?: string;
  logo_url?: string;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;

    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant del usuario." };
    if (!data.name?.trim()) return { success: false, error: "El nombre de la organización es obligatorio." };

    // Usar service_role para actualizar — el tenant_id ya está validado desde el JWT
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; } } }
    );

    const { error } = await serviceSupabase
      .from("tenants")
      .update({
        name:     data.name.trim(),
        domain:   data.domain   || null,
        logo_url: data.logo_url || null,
      })
      .eq("id", tenantId);

    if (error) throw new Error(error.message);

    revalidatePath("/app/configuracion");
    return { success: true };
  } catch (err: any) {
    console.error("Error actualizando tenant:", err);
    return { success: false, error: err.message };
  }
}
