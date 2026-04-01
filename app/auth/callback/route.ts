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
  const next = searchParams.get("next") ?? "/app/dashboard"

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sesión establecida → redirigir al panel
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error("[Auth Callback] exchangeCodeForSession error:", error.message)
  }

  // Error o sin code → redirigir al login con aviso
  return NextResponse.redirect(
    `${origin}/login?error=email_confirmation_failed`
  )
}
