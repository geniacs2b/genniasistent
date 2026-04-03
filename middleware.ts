import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rutas internas del motor de certificados: workers de QStash y jobs API.
  // Early return sin tocar Supabase auth — estas rutas son invocadas por QStash
  // (sin cookies de usuario) y no deben incurrir en el overhead de getUser().
  if (
    pathname.startsWith('/api/workers/') ||
    pathname.startsWith('/api/jobs/')
  ) {
    return NextResponse.next({ request });
  }

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

  const searchParams = request.nextUrl.searchParams;
  
  // Detect internal Next.js / RSC requests
  // Next.js uses RSC header, _rsc query param, or text/x-component Accept header
  const isRSCRequest = request.headers.get('RSC') === '1' || searchParams.has('_rsc');
  const isPrefetch = request.headers.get('Next-Router-Prefetch') === '1';
  const isComponentFetch = request.headers.get('Accept')?.includes('text/x-component');

  // Skip redirect logic for internal Next.js data requests
  const isDataRequest = isRSCRequest || isPrefetch || isComponentFetch;

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

  // Redirección Selectiva: Solo si es una petición de navegación completa (Documento HTML)
  // No interrumpimos peticiones RSC/Prefetch con un redirect 302/307 a una página HTML
  // Esto evita el error "Failed to fetch RSC payload" y problemas de CORS en pre-fetching
  if (!isDataRequest) {
    // 1. Proteger panel de administración (/app)
    if (isAppRoute) {
      if (!user) return NextResponse.redirect(new URL('/login', request.url));
      if (!tenantId) return NextResponse.redirect(new URL('/onboarding/setup-empresa', request.url));
    }

    // 2. Proteger Onboarding (/onboarding)
    if (isOnboardingRoute) {
      if (!user) return NextResponse.redirect(new URL('/login', request.url));
      if (tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
    }

    // 3. Bloquear rutas de auth a usuarios ya autenticados con tenant
    if (isAuthRoute) {
      if (user && tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
      if (user && !tenantId && pathname !== '/registro') {
        return NextResponse.redirect(new URL('/onboarding/setup-empresa', request.url));
      }
    }

    // Landing page redirect para usuarios autenticados
    if (pathname === '/') {
      if (user && tenantId) return NextResponse.redirect(new URL('/app/dashboard', request.url));
    }
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
