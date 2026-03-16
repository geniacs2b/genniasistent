import { createClient } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import { EventoForm } from "@/components/EventoForm";
import { EventoActions } from "@/components/EventoActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: evento, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !evento) return notFound();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/eventos">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Editar Evento</h1>
            <p className="text-xs text-muted-foreground">Modifica la información del evento seleccionado.</p>
          </div>
        </div>
        <EventoActions 
          eventoId={evento.id} 
          hasTemplate={!!evento.plantilla_certificado_id} 
        />
      </div>
      <EventoForm evento={evento} isEdit tiposEvento={enrichedTiposEvento as any} />
    </div>
  );
}
