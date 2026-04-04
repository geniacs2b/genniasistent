import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { acceptInvitationAction } from "@/app/actions/tenantActions";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

/**
 * /unirse?token=xxx
 *
 * Flujo:
 * 1. Si el usuario NO está autenticado → redirige al login con el token en ?next=/unirse?token=xxx
 * 2. Si está autenticado → intenta aceptar la invitación
 * 3. Éxito → redirige al dashboard de la nueva organización
 * 4. Error → muestra mensaje de error
 */
export default async function UnirsePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Enlace inválido</h1>
          <p className="text-slate-500">Este enlace de invitación no es válido. Contacta al administrador de tu organización.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirigir al login conservando el token para completar la invitación tras autenticarse
    const next = encodeURIComponent(`/unirse?token=${token}`);
    redirect(`/auth/login?next=${next}`);
  }

  // Usuario autenticado — intentar aceptar la invitación
  const result = await acceptInvitationAction(token);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <span className="text-red-500 text-2xl">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Error al unirse</h1>
          <p className="text-slate-500 dark:text-slate-400">{result.error}</p>
          <a href="/app/dashboard" className="inline-block mt-2 text-primary font-semibold hover:underline">
            Ir al panel →
          </a>
        </div>
      </div>
    );
  }

  // Éxito — forzar recarga de sesión y redirigir al dashboard
  // El app_metadata ya fue actualizado por acceptInvitationAction, pero el cliente
  // necesita re-autenticarse para que el JWT refleje el nuevo tenant_id.
  // Redirigimos a /auth/refresh?next=/app/dashboard si existe, o directo.
  redirect("/app/dashboard");
}
