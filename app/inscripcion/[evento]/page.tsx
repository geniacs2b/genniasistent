import { eventService } from "@/services/eventService";
import { formService } from "@/services/formService";
import { DynamicForm } from "@/components/DynamicForm";
import { notFound } from "next/navigation";
import { getRegistrationDataAction } from "@/app/actions/registration";

export default async function InscripcionPage({ 
  params, 
  searchParams 
}: { 
  params: { evento: string },
  searchParams: { edit?: string; doc?: string; type?: string; personaId?: string } 
}) {
  try {
    // 1. Obtener Evento basándose en el slug del formulario
    const { evento, formularioId, fecha_apertura, fecha_cierre } = await eventService.getEventByFormSlug(params.evento);
    
    if (!evento || !evento.activo) {
      return notFound();
    }

    // 2. Obtener la estructura dinámica del formulario asociada
    const fields = await formService.getFormStructureForEvent(evento.id);

    // 3. Si viene de edición, cargar datos previos
    let initialData = null;
    if (searchParams.edit === 'true' && (searchParams.personaId || (searchParams.doc && searchParams.type))) {
      const res = await getRegistrationDataAction(
        evento.id, 
        searchParams.doc, 
        searchParams.type, 
        searchParams.personaId
      );
      if (res.success) {
        initialData = res.data;
      }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex flex-col items-center py-12 px-4 selection:bg-primary/20">
        <div className="w-full max-w-3xl">
          <DynamicForm 
            eventoId={evento.id} 
            formularioId={formularioId}
            eventoTitulo={evento.titulo}
            eventoDescripcion={evento.descripcion}
            eventoFechaInicio={evento.fecha_inicio}
            eventoHoraInicio={evento.hora_inicio}
            eventoLugar={evento.lugar}
            fields={fields} 
            fechaApertura={fecha_apertura}
            fechaCierre={fecha_cierre}
            formSlug={params.evento}
            initialData={initialData}
          />
        </div>
      </div>
    );
  } catch (error) {
    return notFound();
  }
}
