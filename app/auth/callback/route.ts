import { createServerClient } from "@supabase/ssr"
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

  if (code) {
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

    const { data: exchangeData, error } = await supabase.auth.exchangeCodeForSession(code)
    const session = exchangeData?.session;

    if (!error && session) {
      if (mode === "connect_gmail" && session.provider_token) {
        const user = session.user;
        const tenantId = user.app_metadata?.tenant_id;
        
        if (tenantId) {
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1);

          const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: {} }
          );

          await supabaseAdmin
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
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }

    if (error) {
       console.error("[Auth Callback] exchangeCodeForSession error:", error.message)
    }
  }

  // Error o sin code → redirigir al login con aviso
  return NextResponse.redirect(
    `${origin}/login?error=email_confirmation_failed`
  )
}
