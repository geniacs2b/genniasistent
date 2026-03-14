import { createBrowserClient } from '@supabase/ssr'

// Usamos el cliente sin genérico Database para maximizar compatibilidad
// con los selects dinámicos en los componentes.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
