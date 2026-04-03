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
  // Estado del motor nativo (fuente principal)
  Enviado:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  // Estados de elegibilidad (pre-envío)
  Autorizado:  "bg-amber-100 text-amber-700 border-amber-200",
  Cumple:      "bg-amber-100 text-amber-700 border-amber-200",
  // Estados sin acción disponible
  "No enviado":"bg-slate-100 text-slate-500 border-slate-200",
  "No cumple": "bg-slate-100 text-slate-500 border-slate-200",
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
      <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-bold uppercase tracking-wider">Filtrar por evento:</span>
        </div>
        <Select value={selectedEvento} onValueChange={setSelectedEvento}>
          <SelectTrigger className="w-full sm:w-[300px] h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-primary/20 transition-all font-medium">
            <SelectValue placeholder="Todos los eventos" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
            <SelectItem value="all" className="font-semibold text-primary">Todos los eventos</SelectItem>
            {eventos.map((titulo: any) => (
              <SelectItem key={titulo} value={titulo}>
                {titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="h-7 px-3 rounded-full border-slate-200 dark:border-slate-700 text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50">
            {filteredInscripciones.length} registros encontrados
          </Badge>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
            <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
               <TableHead className="font-bold text-slate-600 dark:text-slate-300 h-14 pl-6">Nombre / Documento</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Correo (Verificación)</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Evento</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">SESIONES</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Estado Certificado</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300 pr-6 text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInscripciones.map((insc) => {
              const persona = insc.personas as any;
              const evento = insc.eventos as any;
              return (
                <TableRow key={insc.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-primary/5 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex flex-col">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {persona?.nombre_completo || 'Sin nombre'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {persona?.numero_documento || 'Sin documento'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex flex-col gap-1">
                      {persona?.correo && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {persona.correo}
                        </span>
                      )}
                      {persona?.correo_verificado ? (
                        <Badge variant="default" className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 w-fit uppercase tracking-wider shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 text-slate-400 border-slate-200 flex items-center gap-1.5 w-fit uppercase tracking-wider">
                          <XCircle className="w-3.5 h-3.5" /> No Verificado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase">
                      {evento?.titulo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      {/* Pill de progreso */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-sm font-extrabold tabular-nums tracking-tight ${
                          insc.cumple_asistencia
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                        }`}
                      >
                        {insc.asistencias_validas ?? 0}
                        <span className="font-medium opacity-50">/</span>
                        {insc.total_sesiones ?? 0}
                      </span>
                      {/* Badge de estado */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                          insc.cumple_asistencia
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                        }`}
                      >
                        {insc.cumple_asistencia ? 'Cumple' : 'Pendiente'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-bold px-3 py-1 rounded-full text-xs uppercase border ${
                        estadoBadgeClass[insc.estado_visual] ?? 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {insc.estado_visual}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center justify-center">
                      {/* Participante elegible — primer envío */}
                      {insc.accion_boton === 'enviar' && (
                        <Button
                          size="sm"
                          className="h-9 gap-2 text-xs font-bold uppercase transition-all shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleManualSend(insc, false)}
                          disabled={!!sendingId}
                        >
                          {sendingId === `${insc.id}-cert` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          Enviar Correo
                        </Button>
                      )}

                      {/* Envío previo falló — reintentar */}
                      {insc.accion_boton === 'reenviar' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-2 text-xs font-bold uppercase transition-all shadow-sm text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleManualSend(insc, false)}
                          disabled={!!sendingId}
                        >
                          {sendingId === `${insc.id}-cert` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Reintentar
                        </Button>
                      )}

                      {/* Ya enviado — el admin puede forzar un reenvío manual */}
                      {insc.enviado && !insc.accion_boton && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-2 text-xs font-bold uppercase transition-all shadow-sm text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleManualSend(insc, true)}
                          disabled={!!sendingId}
                          title="El certificado ya fue enviado. Usa esta opción solo si necesitas reenviarlo manualmente."
                        >
                          {sendingId === `${insc.id}-cert` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Reenviar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInscripciones.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 font-medium py-20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Search className="w-8 h-8 text-slate-300" />
                    <span>No se encontraron inscritos para este filtro.</span>
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
