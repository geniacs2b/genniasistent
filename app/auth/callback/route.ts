import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Callback de Supabase Auth — intercambia el `code` PKCE por una sesión activa.
 * Supabase redirige aquí después de que el usuario confirma su correo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const mode = searchParams.get("mode")
  const next = searchParams.get("next") ?? (mode === "connect_gmail" ? "/app/correos?oauth_success=true" : "/app/dashboard")

  console.log(`[Auth Callback] Inicio del flujo - Mode: ${mode}, Code: ${code ? "PROVISTO" : "NULO"}`)

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options: any) {
              try { cookieStore.set({ name, value, ...options }) } catch {}
            },
            remove(name: string, options: any) {
              try { cookieStore.set({ name, value: "", ...options }) } catch {}
            },
          },
        }
      )

      console.log("[Auth Callback] Intercambiando código por sesión...")
      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error("[Auth Callback] Error en exchangeCodeForSession:", exchangeError.message)
        throw exchangeError
      }

      const session = exchangeData?.session;
      if (!session) {
        console.error("[Auth Callback] No se obtuvo sesión tras el intercambio.")
        throw new Error("No session returned from exchangeCodeForSession")
      }

      console.log("[Auth Callback] Sesión obtenida correctamente.")

      // ── MODO CONEXIÓN GMAIL ──────────────────────────────────────────
      if (mode === "connect_gmail") {
        console.log("[Auth Callback] Iniciando persistencia de conectividad Gmail...")
        
        if (!session.provider_token) {
          console.warn("[Auth Callback] Advertencia: connect_gmail solicitado pero provider_token es nulo.")
        }

        const user = session.user;
        const tenantId = user.app_metadata?.tenant_id;
        
        console.log(`[Auth Callback] Datos de usuario - Email: ${user.email}, TenantID: ${tenantId}`)

        if (!tenantId) {
          console.error("[Auth Callback] Error: No se encontró tenant_id en app_metadata del usuario.")
          // No lanzamos error para no romper el login, pero no guardaremos configuración
        } else {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!serviceKey) {
            console.error("[Auth Callback] Error CRÍTICO: SUPABASE_SERVICE_ROLE_KEY no configurado en entorno.")
            throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
          }

          const tokenExpiresAt = new Date();
          tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1);

          console.log("[Auth Callback] Inicializando cliente admin (supabase-js)...")
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
          );

          console.log("[Auth Callback] Ejecutando upsert en email_configurations...")
          const { error: upsertError } = await supabaseAdmin
            .from("email_configurations")
            .upsert({
              tenant_id: tenantId,
              provider: 'google_oauth',
              sender_email: user.email,
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token,
              token_expires_at: tokenExpiresAt.toISOString(),
              is_active: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id' });

          if (upsertError) {
            console.error("[Auth Callback] Error en upsert de DB:", upsertError.message)
            throw upsertError
          }
          
          console.log("[Auth Callback] Configuración de Gmail guardada con éxito.")
        }
      }

      console.log(`[Auth Callback] Finalización exitosa. Redirigiendo a: ${next}`)
      return NextResponse.redirect(`${origin}${next}`)

    } catch (err: any) {
      console.error("[Auth Callback] EXCEPCIÓN CAPTURADA:", err.message || err)
      // Evitar que el error se convierta en un 500 genérico vacío
      return NextResponse.redirect(
        `${origin}/login?error=auth_callback_exception&message=${encodeURIComponent(err.message || "Unknown error")}`
      )
    }
  }

  console.warn("[Auth Callback] Intento de acceso sin parámetro code.")
  return NextResponse.redirect(
    `${origin}/login?error=email_confirmation_failed`
  )
}
