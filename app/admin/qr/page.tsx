import { createClient } from "@/lib/supabaseServer";
import { QRPageClient } from "./QRPageClient";

export const dynamic = 'force-dynamic';

export default async function QRPage() {
  const supabase = createClient();
  const [{ data: sesiones }, { data: tokens }] = await Promise.all([
    supabase
      .from("sesiones_evento")
      .select("id, nombre, fecha, eventos(titulo)")
      .order("fecha", { ascending: false }),
    supabase
      .from("qr_tokens_asistencia")
      .select("id, token, estado, activo, fecha_activacion, fecha_desactivacion, created_at, sesiones_evento(nombre, fecha, eventos(titulo))")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Gestión de QR por Sesión</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Genera y controla los tokens QR de asistencia manualmente por sesión.</p>
        </div>
      </div>
      <QRPageClient sesiones={sesiones || []} tokens={tokens || []} />
    </div>
  );
}
