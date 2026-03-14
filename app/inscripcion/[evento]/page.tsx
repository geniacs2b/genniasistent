import { eventService } from "@/services/eventService";
import { formService } from "@/services/formService";
import { DynamicForm } from "@/components/DynamicForm";
import { notFound } from "next/navigation";

export default async function InscripcionPage({ params }: { params: { evento: string } }) {
  try {
    // 1. Obtener Evento basándose en el slug del formulario (la URL compartida)
    const { evento, formularioId, fecha_apertura, fecha_cierre } = await eventService.getEventByFormSlug(params.evento);
    
    if (!evento || !evento.activo) {
      return notFound();
    }

    // 2. Obtener la estructura dinámica del formulario asociada
    const fields = await formService.getFormStructureForEvent(evento.id);

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
          />
        </div>
      </div>
    );
  } catch (error) {
    return notFound();
  }
}
