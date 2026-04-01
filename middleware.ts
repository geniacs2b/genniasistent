import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;
  
  // API requests, auth callback, and internal paths bypass strict UI routing
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return supabaseResponse;
  }

  const isAuthRoute = pathname === '/login' || pathname === '/registro' || pathname === '/recuperar-password';
  const isAppRoute  = pathname.startsWith('/app');
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  const tenantId = user?.app_metadata?.tenant_id;

  // 1. Proteger panel de administración (/app)
  if (isAppRoute) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    // Sin tenant: fallback al onboarding (usuarios legacy sin tenant)
    if (!tenantId) return NextResponse.redirect(new URL('/onboarding/setup-empresa', request.url));
  }

  // 2. Proteger Onboarding (/onboarding) — flujo legacy, solo si no tienen tenant aún
  if (isOnboardingRoute) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url));
    if (tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  // 3. Bloquear rutas de auth a usuarios ya autenticados con tenant
  if (isAuthRoute) {
    if (user && tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
    // Usuario autenticado sin tenant: deja pasar a /registro, redirige al onboarding desde otros
    if (user && !tenantId && pathname !== '/registro') {
      return NextResponse.redirect(new URL('/onboarding/setup-empresa', request.url));
    }
  }

  // Landing page redirect para usuarios autenticados
  if (pathname === '/') {
    if (user && tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
