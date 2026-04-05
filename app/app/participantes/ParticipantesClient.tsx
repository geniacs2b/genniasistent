"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatToBogota } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Award, Send, RotateCcw, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const estadoBadgeClass: Record<string, string> = {
  // Estados de entrega / éxito
  enviado:      "bg-emerald-500/12 text-[#15803D] dark:bg-emerald-500/10 dark:text-emerald-400 border-0",
  completado:   "bg-emerald-500/12 text-[#15803D] dark:bg-emerald-500/10 dark:text-emerald-400 border-0",
  // Estados intermedios / elegibilidad
  pendiente:    "bg-amber-500/12 text-[#D97706] dark:bg-amber-500/10 dark:text-amber-400 border-0",
  autorizado:   "bg-amber-500/12 text-[#D97706] dark:bg-amber-500/10 dark:text-amber-400 border-0",
  procesando:   "bg-[#EEF2FF] text-[#3730A3] dark:bg-indigo-500/10 dark:text-indigo-400 border-0",
  // Estados negativos / fallo
  fallido:      "bg-rose-500/12 text-[#B91C1C] dark:bg-rose-500/10 dark:text-rose-400 border-0",
  "no cumple":  "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-0",
  inscrito:     "bg-slate-50 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 border-0",
};

interface ParticipantesClientProps {
  initialInscripciones: any[];
}

export function ParticipantesClient({ initialInscripciones }: ParticipantesClientProps) {
  const [selectedEvento, setSelectedEvento] = useState("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Extraer eventos únicos para el filtro
  const eventos = Array.from(
    new Set(initialInscripciones.map((insc) => insc.eventos?.titulo))
  ).filter(Boolean);

  const filteredInscripciones = initialInscripciones.filter((insc) => {
    if (selectedEvento === "all") return true;
    return insc.eventos?.titulo === selectedEvento;
  });

  const handleManualSend = async (insc: any, isResend: boolean = false) => {
    const sendKey = `${insc.id}-cert`;
    setSendingId(sendKey);
    try {
      const { automationService } = await import("@/services/automationService");
      const origen = isResend ? 'reenvio_manual' : 'manual';
      const result = await automationService.triggerIndividualCertificate(
        insc.evento_id,
        insc.persona_id,
        origen
      );

      if (result.ok) {
        toast({
          title: isResend ? "Reenvío iniciado" : "Envío iniciado",
          description: result.message,
        });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error de conexión", description: error.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-6 py-5 rounded-2xl border border-slate-200/40 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5 text-slate-400">
          <Filter className="w-4 h-4" strokeWidth={2.5} />
          <span className="text-[12px] font-black uppercase tracking-[0.1em]">Filtrar Evento</span>
        </div>
        <Select value={selectedEvento} onValueChange={setSelectedEvento}>
          <SelectTrigger className="w-full sm:w-[350px] h-11 bg-slate-50/50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 rounded-xl shadow-none focus:ring-primary/10 transition-all font-bold text-[13px] text-slate-700 dark:text-slate-300">
            <SelectValue placeholder="Todos los eventos" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200/80 dark:border-slate-700 shadow-2xl">
            <SelectItem value="all" className="font-bold text-emerald-600 dark:text-emerald-500">Todos los eventos</SelectItem>
            {eventos.map((titulo: any) => (
              <SelectItem key={titulo} value={titulo} className="font-medium">
                {titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-lg border border-indigo-100/50 dark:border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70 animate-pulse"></span>
            <span className="text-[11px] font-bold text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-wider">
              {filteredInscripciones.length} registros
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-slate-200/50 dark:border-slate-800">
            <TableRow className="hover:bg-transparent border-0">
               <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 h-14 pl-7">Participante</TableHead>
              <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400">Verificación / Contacto</TableHead>
              <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400">Evento</TableHead>
              <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400">Progreso Sesiones</TableHead>
              <TableHead className="text-[12px] uppercase font-extrabold tracking-[0.08em] text-slate-400 pr-7 text-right">Certificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInscripciones.map((insc) => {
              const persona = insc.personas as any;
              const evento = insc.eventos as any;
              return (
                <TableRow key={insc.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-[#F9FBFD] dark:hover:bg-slate-800/30 transition-all duration-300 group hover:scale-[1.002]">
                  <TableCell className="py-6 pl-7">
                    <div className="flex flex-col">
                      <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100 italic leading-tight">
                        {persona?.nombre_completo || 'Sin nombre'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">CI/CC</span>
                        <span className="text-[12px] text-slate-400 font-medium">
                          {persona?.numero_documento || 'Sin documento'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-slate-600 dark:text-slate-400 font-medium tracking-tight">
                          {persona?.correo || '—'}
                        </span>
                      </div>
                      {persona?.correo_verificado ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Verificado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-extrabold uppercase tracking-widest">Pendiente</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 font-bold text-[10px] uppercase tracking-wider text-slate-500 px-2.5 py-0.5 rounded-full">
                      {evento?.titulo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[15px] font-black tabular-nums ${insc.cumple_asistencia ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {insc.asistencias_validas ?? 0}
                          </span>
                          <span className="text-[11px] font-bold text-slate-300">/</span>
                          <span className="text-[13px] font-bold text-slate-400 tabular-nums">
                            {insc.total_sesiones ?? 0}
                          </span>
                        </div>
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${insc.cumple_asistencia ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            style={{ width: `${Math.min(100, ((insc.asistencias_validas ?? 0) / (insc.total_sesiones || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="pr-7 text-right">
                    <Badge
                      className={`font-black px-4 py-1.5 rounded-full text-[11px] uppercase tracking-wider transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(0,0,0,0.05)] ${
                        estadoBadgeClass[insc.estado_db?.toLowerCase()] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-600 border-0'
                      }`}
                    >
                      {insc.estado_db === 'enviado' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 relative inline-block">
                          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                        </span>
                      )}
                      {insc.estado_db}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInscripciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 font-medium py-32">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                      <Search className="w-7 h-7 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[15px] font-bold text-slate-600 dark:text-slate-400">No se encontraron inscritos</p>
                      <p className="text-[13px] text-slate-400">Intenta ajustar los filtros de evento para ver más resultados.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
