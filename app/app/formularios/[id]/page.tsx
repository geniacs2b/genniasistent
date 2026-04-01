import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { FormBuilderClient } from "./FormBuilderClient";

export const dynamic = 'force-dynamic';

export default async function FormularioDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: formulario }, { data: campos }] = await Promise.all([
    supabase
      .from("formularios")
      .select("id, descripcion, fecha_apertura, fecha_cierre, eventos(titulo, fecha_inicio)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("formulario_campos")
      .select("*")
      .eq("formulario_id", params.id)
      .order("orden", { ascending: true }),
  ]);

  const formularioData = formulario as any;
  if (!formulario) return notFound();


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurar Formulario</h1>
        <p className="text-muted-foreground mt-1">
          Evento: <strong>{formularioData?.eventos?.titulo}</strong>
        </p>
      </div>
      <FormBuilderClient 
        formularioId={params.id} 
        initialCampos={campos || []} 
        initialFechaApertura={formularioData?.fecha_apertura}
        initialFechaCierre={formularioData?.fecha_cierre}
        eventoFechaInicio={formularioData?.eventos?.fecha_inicio}
      />
    </div>
  );
}
