"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export interface RegisterFormData {
  nombres: string
  apellidos: string
  email: string
  password: string
  whatsapp: string
  empresaNombre: string
  tipoOrganizacion: string
  ciudad: string
  pais: string
  sitioWeb?: string
}

export async function registerWithTenantAction(data: RegisterFormData): Promise<{
  success: boolean
  error?: string
  requiresEmailConfirmation?: boolean
  email?: string
}> {
  const cookieStore = cookies()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  const email   = data.email.toLowerCase().trim()

  // ── Cliente anon — únicamente para signUp (gestiona PKCE + email)
  const anonSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string)                       { return cookieStore.get(name)?.value },
        set(name: string, value: string, opts: any) { try { cookieStore.set({ name, value, ...opts }) } catch {} },
        remove(name: string, opts: any)         { try { cookieStore.set({ name, value: "", ...opts }) } catch {} },
      },
    }
  )

  // ── Cliente admin (service_role) — para todo lo que requiere bypasear RLS
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return undefined }, set() {}, remove() {} } }
  )

  console.log("[Registro] ── INICIO ────────────────────────────────────")
  console.log("[Registro] email:", email)

  // ────────────────────────────────────────────────────────────────
  // PASO 1 — signUp via anon client
  //
  // POR QUÉ signUp() en vez de admin.createUser():
  //   signUp() es el único método que envía el correo de confirmación
  //   automáticamente a través del SMTP de Supabase y usa el flujo PKCE
  //   (emailRedirectTo → /auth/callback?code=...).
  //
  //   admin.createUser() crea el usuario pero NO envía ningún email.
  //   generateLink() genera el token pero tampoco envía el email.
  //
  // POR QUÉ signUp() puede romper la FK tenant_users_user_id_fkey:
  //   Cuando el correo YA existe, Supabase retorna un user.id "fantasma"
  //   (protección anti-enumeración) que NO existe en auth.users.
  //   Insertar tenant_users con ese ID causa la violación de FK.
  //
  // SOLUCIÓN OFICIAL (documentación de Supabase):
  //   Verificar user.identities — si el array es vacío, el correo
  //   ya existe y el user.id devuelto es ficticio. El ID real solo
  //   se garantiza cuando identities.length > 0.
  // ────────────────────────────────────────────────────────────────
  console.log("[Registro] PASO 1: signUp anon →", email)

  const { data: authData, error: signUpError } = await anonSupabase.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
      data: {
        nombres:   data.nombres.trim(),
        apellidos: data.apellidos.trim(),
        whatsapp:  data.whatsapp.trim(),
      },
    },
  })

  if (signUpError) {
    console.error("[Registro] PASO 1 FALLO — signUp error:", signUpError.message)
    return { success: false, error: signUpError.message }
  }

  const user = authData?.user
  if (!user?.id) {
    console.error("[Registro] PASO 1 FALLO — user o user.id es null")
    return { success: false, error: "No se pudo crear la cuenta. Intenta de nuevo." }
  }

  // ── Detección de email duplicado (patrón oficial de Supabase) ───
  // identities[] vacío = correo ya registrado = user.id ficticio = FK va a fallar
  if (!user.identities || user.identities.length === 0) {
    console.warn("[Registro] PASO 1 — Email duplicado detectado:", email)
    return {
      success: false,
      error:   "Este correo ya está registrado. Intenta iniciar sesión o usa otro correo.",
    }
  }

  console.log("[Registro] PASO 1 OK — user.id real:", user.id)
  console.log("[Registro] PASO 1 OK — identities:", user.identities.length, "| session:", !!authData.session)

  // ────────────────────────────────────────────────────────────────
  // PASO 2 — Crear tenant
  // ────────────────────────────────────────────────────────────────
  console.log("[Registro] PASO 2: Insertando tenant →", data.empresaNombre.trim())

  const { data: tenant, error: tenantError } = await adminSupabase
    .from("tenants")
    .insert({
      name:              data.empresaNombre.trim(),
      billing_status:    "trial",
      current_plan_key:  null,
      certificate_quota: 5,
    })
    .select("id, name")
    .single()

  if (tenantError || !tenant?.id) {
    console.error("[Registro] PASO 2 FALLO — tenant insert error:", tenantError?.message)
    await adminSupabase.auth.admin.deleteUser(user.id)
    console.log("[Registro] PASO 2 ROLLBACK — usuario eliminado:", user.id)
    return {
      success: false,
      error:   `Error al crear la organización: ${tenantError?.message ?? "sin detalle"}`,
    }
  }

  console.log("[Registro] PASO 2 OK — tenant.id:", tenant.id)

  // ────────────────────────────────────────────────────────────────
  // PASO 3 — Vincular usuario como owner en tenant_users
  //
  // user.id es REAL (verificado por identities en PASO 1) →
  // la FK tenant_users_user_id_fkey → auth.users.id se satisface.
  // ────────────────────────────────────────────────────────────────
  console.log("[Registro] PASO 3: Insertando tenant_users →", {
    tenant_id: tenant.id,
    user_id:   user.id,
    role:      "owner",
  })

  const { error: linkError } = await adminSupabase.from("tenant_users").insert({
    tenant_id: tenant.id,
    user_id:   user.id,
    role:      "owner",
  })

  if (linkError) {
    console.error("[Registro] PASO 3 FALLO — tenant_users insert error:", linkError.message)
    await adminSupabase.auth.admin.deleteUser(user.id)
    await adminSupabase.from("tenants").delete().eq("id", tenant.id)
    console.log("[Registro] PASO 3 ROLLBACK — usuario y tenant eliminados")
    return {
      success: false,
      error:   `Error al vincular la organización: ${linkError.message}`,
    }
  }

  console.log("[Registro] PASO 3 OK — tenant_users insertado")

  // ────────────────────────────────────────────────────────────────
  // PASO 4 — Actualizar app_metadata con tenant_id
  //
  // El JWT del usuario llevará tenant_id en app_metadata desde el
  // primer inicio de sesión (o tras refreshSession en el cliente).
  // ────────────────────────────────────────────────────────────────
  console.log("[Registro] PASO 4: Actualizando app_metadata → tenant_id:", tenant.id)

  const { error: metaError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    app_metadata: { tenant_id: tenant.id },
  })

  if (metaError) {
    console.error("[Registro] PASO 4 WARN — updateUserById error (no crítico):", metaError.message)
    // No revertimos: tenant + tenant_users ya existen.
    // El usuario podrá ingresar aunque el primer JWT no traiga tenant_id;
    // basta con hacer refreshSession() después del login.
  } else {
    console.log("[Registro] PASO 4 OK — app_metadata.tenant_id:", tenant.id)
  }

  const requiresEmailConfirmation = !authData.session
  console.log("[Registro] ✅ ÉXITO — user:", user.id, "| tenant:", tenant.id,
    "| email_confirmation_needed:", requiresEmailConfirmation)
  console.log("[Registro] ── FIN ──────────────────────────────────────")

  return {
    success: true,
    requiresEmailConfirmation,
    email:   data.email,
  }
}
