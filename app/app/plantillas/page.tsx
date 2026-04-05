import { createClient } from "@/lib/supabaseServer";
import { eventService } from "@/services/eventService";
import { PlantillasClient } from "./PlantillasClient";
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function PlantillasPage() {
  noStore();
  // Usar servidor para respetar RLS del tenant autenticado
  const supabase = createClient();
  const [{ data: templates }, events] = await Promise.all([
    supabase
      .from("plantillas_certificado")
      .select("id, nombre, archivo_base_url, ancho_px, alto_px, tenant_id, created_at")
      .order("created_at", { ascending: false }),
    eventService.getActiveEvents().catch(() => []),
  ]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 sm:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.02)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Automatización Visual</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic">
            Diseño de Certificados
          </h1>
          <p className="text-[17px] font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Crea, gestiona y personaliza plantillas dinámicas para la emisión automática de certificados de tus eventos.
          </p>
        </div>
        
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 self-center">
            <div className="flex -space-x-3">
               {[1,2].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {i}
                 </div>
               ))}
            </div>
            <span className="text-xs font-bold text-slate-500 mr-2">Estudio de Diseño</span>
        </div>
      </div>

      <PlantillasClient initialTemplates={templates || []} events={events} />
    </div>
  );
}
