import { certificateTemplateService } from "@/services/certificateTemplateService";
import { eventService } from "@/services/eventService";
import { PlantillasClient } from "./PlantillasClient";
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function PlantillasPage() {
  noStore();
  const [templates, events] = await Promise.all([
    certificateTemplateService.getTemplates().catch(() => []),
    eventService.getActiveEvents().catch(() => [])
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
      <PlantillasClient initialTemplates={templates} events={events} />
    </div>
  );
}
