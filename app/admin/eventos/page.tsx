import { createClient } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EventosClient } from "./EventosClient";

export const dynamic = 'force-dynamic';

export default async function EventosPage() {
  const supabase = createClient();
  const { data: eventosRaw, error } = await supabase
    .from("eventos")
    .select(`
      id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, modalidad, lugar, activo, cupo_maximo, plantilla_certificado_id,
      inscripciones:inscripciones(count)
    `)
    .order("fecha_inicio", { ascending: false });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Eventos</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Gestiona todos los eventos de la plataforma desde un solo lugar.</p>
        </div>
        <Link href="/admin/eventos/nuevo">
          <Button className="h-12 px-6 rounded-xl font-bold gap-2 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 bg-primary text-primary-foreground">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Crear Nuevo Evento
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Error al cargar eventos: {error.message}
        </div>
      )}

      <EventosClient initialEvents={eventosRaw || []} />
    </div>
  );
}
