import { createClient } from "@/lib/supabaseServer";
import { EventoForm } from "@/components/EventoForm";

export default async function NuevoEventoPage() {
  const supabase = createClient();
  const { data: tiposEvento } = await supabase
    .from("tipos_evento")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");

  const { data: plantillas } = await supabase
    .from("plantillas_correo")
    .select("id, nombre_plantilla")
    .eq("activo", true)
    .order("nombre_plantilla");

  // Inyectar plantillas en el objeto tiposEvento como data extra para el formulario
  const enrichedTiposEvento = tiposEvento ? Object.assign(tiposEvento, { plantillas_correo: plantillas }) : [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Nuevo Evento</h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Completa los datos detallados para crear un nuevo evento en la plataforma.</p>
      </div>
      <EventoForm tiposEvento={enrichedTiposEvento as any} />
    </div>
  );
}
