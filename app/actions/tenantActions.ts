"use server"

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@/lib/supabaseServer"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { BUCKET_TENANT_LOGOS, buildTenantLogoPath } from "@/lib/storageConstants"
import { isPlanAtLeast } from "@/lib/planConfig"

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function makeServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return undefined; } } }
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   createTenantAction — Onboarding: creates tenant + owner link
───────────────────────────────────────────────────────────────────────────── */

export async function createTenantAction(formData: FormData) {
  const cookieStore = await cookies()
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

  const serviceSupabase = makeServiceClient();

  try {
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

    const { error: linkError } = await serviceSupabase
      .from("tenant_users")
      .insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" })

    if (linkError) throw new Error(linkError.message)

    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
      user.id,
      { app_metadata: { tenant_id: tenant.id } }
    )

    if (updateError) throw new Error(updateError.message)

    return { success: true, message: "Empresa creada exitosamente.", tenant_id: tenant.id }
  } catch (err: any) {
    console.error("Error creando tenant:", err)
    return { success: false, error: err.message || "Fallo interno al crear el espacio." }
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   updateTenantAction — Guardar datos básicos + colores públicos
───────────────────────────────────────────────────────────────────────────── */

export async function updateTenantAction(data: {
  name: string;
  domain?: string;
  logo_url?: string;
  public_header_bg_color?: string;
  public_header_bg_secondary?: string;
}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;

    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };
    if (!data.name?.trim()) return { success: false, error: "El nombre de la organización es obligatorio." };

    const serviceSupabase = makeServiceClient();

    const { error } = await serviceSupabase
      .from("tenants")
      .update({
        name:                       data.name.trim(),
        domain:                     data.domain   || null,
        logo_url:                   data.logo_url || null,
        public_header_bg_color:     data.public_header_bg_color     || null,
        public_header_bg_secondary: data.public_header_bg_secondary || null,
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

/* ─────────────────────────────────────────────────────────────────────────────
   uploadLogoAction — Sube logo a Storage y actualiza tenants.logo_url
───────────────────────────────────────────────────────────────────────────── */

export async function uploadLogoAction(formData: FormData) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };

    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) return { success: false, error: "No se proporcionó archivo." };

    const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Solo se aceptan PNG, JPG, WebP o SVG." };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: "El archivo no debe superar 2 MB." };
    }

    const serviceSupabase = makeServiceClient();

    // Asegurarse de que el bucket existe (lo crea si no)
    await serviceSupabase.storage.createBucket(BUCKET_TENANT_LOGOS, {
      public: true,
      allowedMimeTypes: ALLOWED_TYPES,
      fileSizeLimit: 2 * 1024 * 1024,
    }).catch(() => { /* bucket ya existe — ignorar error */ });

    const path = buildTenantLogoPath(tenantId, file.name);

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await serviceSupabase.storage
      .from(BUCKET_TENANT_LOGOS)
      .upload(path, arrayBuffer, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = serviceSupabase.storage
      .from(BUCKET_TENANT_LOGOS)
      .getPublicUrl(path);

    // Agregar cache-buster para que el navegador recargue la imagen actualizada
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await serviceSupabase
      .from("tenants")
      .update({ logo_url: publicUrl })
      .eq("id", tenantId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/app/configuracion");
    return { success: true, logo_url: publicUrl };
  } catch (err: any) {
    console.error("[uploadLogoAction]", err);
    return { success: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   deleteLogoAction — Elimina el logo de Storage y limpia tenants.logo_url
───────────────────────────────────────────────────────────────────────────── */

export async function deleteLogoAction() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant." };

    const serviceSupabase = makeServiceClient();

    // Intentar eliminar ambas extensiones comunes
    const paths = ["png", "jpg", "jpeg", "webp", "svg"].map(
      ext => `${tenantId}/logo.${ext}`
    );
    await serviceSupabase.storage.from(BUCKET_TENANT_LOGOS).remove(paths).catch(() => {});

    const { error } = await serviceSupabase
      .from("tenants")
      .update({ logo_url: null })
      .eq("id", tenantId);

    if (error) throw new Error(error.message);

    revalidatePath("/app/configuracion");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   getTeamMembersAction — Lista miembros del equipo con email/nombre
───────────────────────────────────────────────────────────────────────────── */

export async function getTeamMembersAction() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) return { success: false, error: "No se pudo identificar el tenant.", members: [] };

    const serviceSupabase = makeServiceClient();

    const { data, error } = await serviceSupabase.rpc("get_tenant_team_members", {
      p_tenant_id: tenantId,
    });

    if (error) throw new Error(error.message);

    return { success: true, members: data ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message, members: [] };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   inviteTeamMemberAction — Crea invitación + envía email de Supabase Auth
   Requiere plan Pro o superior.
───────────────────────────────────────────────────────────────────────────── */

export async function inviteTeamMemberAction(email: string, role: 'admin' | 'member') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id as string | undefined;
    if (!user || !tenantId) return { success: false, error: "No se pudo identificar el usuario o el tenant." };

    // Verificar plan
    const serviceSupabase = makeServiceClient();
    const { data: tenant } = await serviceSupabase
      .from("tenants")
      .select("billing_status, current_plan_key, certificate_quota")
      .eq("id", tenantId)
      .single();

    if (!isPlanAtLeast(tenant ?? {}, "pro")) {
      return { success: false, error: "Se requiere el plan Pro para invitar miembros al equipo." };
    }

    // Generar token de invitación
    const { data: inv, error: invError } = await serviceSupabase
      .from("team_invitations")
      .insert({
        tenant_id:  tenantId,
        email:      email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select("token")
      .single();

    if (invError) throw new Error(invError.message);

    // Enviar email de invitación via Supabase Auth (magic link / invite)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.PUBLIC_BASE_URL ?? "";
    const redirectTo = `${baseUrl}/unirse?token=${inv.token}`;

    const { error: authError } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { invited_tenant_id: tenantId, invited_role: role, invitation_token: inv.token },
    });

    // Si el usuario ya existe, el invite puede fallar — está bien, el token sigue válido
    if (authError && !authError.message.includes("already registered")) {
      throw new Error(authError.message);
    }

    return {
      success: true,
      message: `Invitación enviada a ${email}. El enlace expira en 7 días.`,
      invite_url: redirectTo,
    };
  } catch (err: any) {
    console.error("[inviteTeamMemberAction]", err);
    return { success: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   acceptInvitationAction — Acepta una invitación pendiente
   Se llama desde /unirse?token=xxx después de que el usuario está autenticado.
───────────────────────────────────────────────────────────────────────────── */

export async function acceptInvitationAction(token: string) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Debes iniciar sesión primero." };

    const serviceSupabase = makeServiceClient();

    // Buscar la invitación
    const { data: inv, error: invError } = await serviceSupabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invError || !inv) {
      return { success: false, error: "El enlace de invitación no es válido o ha expirado." };
    }

    // Verificar que el email coincida
    if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
      return {
        success: false,
        error: `Esta invitación es para ${inv.email}. Inicia sesión con esa cuenta.`,
      };
    }

    // Verificar que no sea ya miembro
    const { data: existing } = await serviceSupabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", inv.tenant_id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      await serviceSupabase
        .from("tenant_users")
        .insert({ tenant_id: inv.tenant_id, user_id: user.id, role: inv.role });
    }

    // Actualizar app_metadata del usuario invitado
    await serviceSupabase.auth.admin.updateUserById(user.id, {
      app_metadata: { tenant_id: inv.tenant_id },
    });

    // Marcar invitación como aceptada
    await serviceSupabase
      .from("team_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    return { success: true, tenant_id: inv.tenant_id };
  } catch (err: any) {
    console.error("[acceptInvitationAction]", err);
    return { success: false, error: err.message };
  }
}
