import { eventService } from "@/services/eventService";
import { formService } from "@/services/formService";
import { DynamicForm } from "@/components/DynamicForm";
import { notFound } from "next/navigation";
import { getRegistrationDataAction } from "@/app/actions/registration";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    
    console.log("--- [InscripcionPage] DIAGNÓSTICO CARGA ---");
    console.log("Slug params.evento:", params.evento);
    console.log("ID Formulario:", formularioId);
    console.log("ID Evento:", evento?.id);
    console.log("Fecha Apertura (Final):", fecha_apertura);
    console.log("Fecha Cierre (Final):", fecha_cierre);
    console.log("-------------------------------------------");
    
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
            imagenFormularioPath={(evento as any).imagen_formulario_path}
            imagenFormularioAlt={(evento as any).imagen_formulario_alt}
            mostrarImagenFormulario={(evento as any).mostrar_imagen_formulario}
          />
        </div>
      </div>
    );
  } catch (error) {
    return notFound();
  }
}
