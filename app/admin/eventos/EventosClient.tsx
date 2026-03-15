"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatToBogota, getBogotaDateTime, BOGOTA_TIMEZONE } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Edit2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { EventoActions } from "@/components/EventoActions";

interface EventosClientProps {
  initialEvents: any[];
}

export function EventosClient({ initialEvents }: EventosClientProps) {
  const [eventos, setEventos] = useState(initialEvents);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setEventos(initialEvents);
  }, [initialEvents]);

  if (!mounted) return null;

  const handleDelete = async (id: string, titulo: string) => {
    const confirmMsg = `¿Seguro que deseas eliminar el evento "${titulo}"?\n\nSe eliminarán también formularios, inscritos, sesiones, QR, asistencias y plantilla asociada.\n\nEsta acción no se puede deshacer.`;
    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.rpc('eliminar_evento_completo', { 
        p_evento_id: id 
      });

      if (error) throw error;

      toast({ title: "Evento eliminado correctamente" });
      setEventos(eventos.filter(ev => ev.id !== id));
      router.refresh();
    } catch (err: any) {
      toast({ title: "Error al eliminar evento", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
          <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
            <TableHead className="font-bold text-slate-600 dark:text-slate-300 h-14">Evento</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Fecha de Inicio</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Modalidad</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Cupo</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Estado</TableHead>
            <TableHead className="text-right font-bold text-slate-600 dark:text-slate-300 pr-6">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((ev) => (
            <TableRow key={ev.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-primary/5 dark:hover:bg-slate-800/50 transition-colors group">
              <TableCell className="font-semibold text-slate-800 dark:text-slate-100 py-4">
                <div className="flex flex-col">
                  <span className="text-base">{ev.titulo}</span>
                  <span className="text-xs text-slate-400 font-medium mt-0.5 w-[200px] truncate" title={ev.lugar || "Sin lugar"}>
                    {ev.lugar ? `📍 ${ev.lugar}` : "—"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-slate-600 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-sm">
                    {formatToBogota(getBogotaDateTime(ev.fecha_inicio, ev.hora_inicio), { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-slate-500 text-sm font-medium capitalize">
                  {ev.modalidad || "—"}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  {ev.cupo_maximo ? `${ev.cupo_maximo} pax` : "Ilimitado"}
                </span>
              </TableCell>
              <TableCell>
                {ev.activo ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 border-0 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    Activo
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 border-0 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                    Inactivo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right pr-4">
                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <EventoActions 
                    eventoId={ev.id} 
                    hasTemplate={!!ev.plantilla_certificado_id} 
                  />
                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2 ml-1">
                    <Link href={`/admin/eventos/${ev.id}/editar`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-secondary hover:bg-primary/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      onClick={() => handleDelete(ev.id, ev.titulo)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {eventos.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-20">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <span className="text-3xl">📅</span>
                  </div>
                  <p className="text-slate-500 text-base font-medium">No hay eventos creados todavía.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
