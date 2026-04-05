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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.04)] overflow-hidden">
      <Table>
        <TableHeader className="bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-slate-200/50 dark:border-slate-800">
          <TableRow className="hover:bg-transparent border-0">
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 h-14 pl-7 cursor-default">Evento</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 cursor-default">Fecha de Inicio</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 cursor-default">Modalidad</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 cursor-default">Participantes</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 text-center cursor-default">Cupo</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 cursor-default">Estado</TableHead>
            <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 text-right pr-7 cursor-default">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((ev) => (
            <TableRow key={ev.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-[#F9FBFD] dark:hover:bg-slate-800/30 transition-all duration-300 group hover:scale-[1.002]">
              <TableCell className="py-6 pl-7">
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100 italic leading-tight">{ev.titulo}</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">ID</span>
                    <span className="text-[12px] text-slate-400 font-medium truncate max-w-[150px]" title={ev.id}>
                      {ev.id.split('-')[0]}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="inline-flex flex-col items-start px-3 py-2 bg-[#F1F5F9] dark:bg-slate-800/80 rounded-lg border border-slate-200/30 dark:border-slate-700/50">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                        {formatToBogota(getBogotaDateTime(ev.fecha_inicio, ev.hora_inicio), { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {formatToBogota(getBogotaDateTime(ev.fecha_inicio, ev.hora_inicio), { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border-0 ${
                    ev.modalidad === 'virtual' ? 'bg-[#EEF2FF] text-[#3730A3] dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {ev.modalidad || "Pendiente"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="bg-[#A7C73A]/12 text-[#6B8E23] dark:bg-[#A7C73A]/10 dark:text-[#A7C73A] border-0 px-3 py-1 rounded-full font-bold text-[11px] transition-transform group-hover:scale-105">
                  {(ev.inscripciones?.[0]?.count || 0) === 1 ? "1 inscrito" : `${ev.inscripciones?.[0]?.count || 0} inscritos`}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-lg font-bold text-[#64748B] dark:text-slate-400" title="Cupo máximo">
                  {ev.cupo_maximo ? `${ev.cupo_maximo}` : "∞"}
                </span>
              </TableCell>
              <TableCell>
                {ev.activo ? (
                  <Badge className="bg-emerald-500/12 text-[#15803D] dark:bg-emerald-500/10 dark:text-emerald-400 border-0 px-3 py-1 rounded-full font-bold text-[11px] group-hover:shadow-[0_0_12px_rgba(34,197,94,0.2)] transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 relative">
                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                    </span>
                    ● Activo
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border-0 px-3 py-1 rounded-full font-bold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                    Inactivo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right pr-7">
                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                  <EventoActions 
                    eventoId={ev.id} 
                    hasTemplate={!!ev.plantilla_certificado_id} 
                  />
                  <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                    <Link href={`/app/eventos/${ev.id}/editar`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
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
              <TableCell colSpan={7} className="text-center py-20">
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
