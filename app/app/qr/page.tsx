import { createClient } from "@/lib/supabaseServer";
import { QRPageClient } from "./QRPageClient";
import { Badge } from "@/components/ui/badge";

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
    <div className="max-w-[1400px] mx-auto space-y-10 sm:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.02)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Seguridad y Acceso</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic">
            Control de Acceso (QR)
          </h1>
          <p className="text-[17px] font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Genera, activa y controla el acceso de participantes en tiempo real por cada sesión de tus eventos.
          </p>
        </div>
        
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 self-center">
            <div className="flex -space-x-3">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {i}
                 </div>
               ))}
            </div>
            <span className="text-xs font-bold text-slate-500 mr-2">Monitoreo Activo</span>
        </div>
      </div>

      <QRPageClient sesiones={sesiones || []} tokens={tokens || []} />
    </div>
  );
}
