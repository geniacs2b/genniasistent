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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Plantillas de Certificado</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            Administra las plantillas para cada evento y configura sus campos dinámicos para la automatización (n8n).
          </p>
        </div>
      </div>
      <PlantillasClient initialTemplates={templates || []} events={events} />
    </div>
  );
}
