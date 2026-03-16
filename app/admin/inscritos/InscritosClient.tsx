"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatToBogota } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Award, Send, RotateCcw, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const estadoBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pendiente_verificacion: "destructive",
  inscrito: "secondary",
  confirmado: "default",
  asistio: "default",
  aprobado: "default",
  certificado_generado: "outline",
  enviado: "outline",
};

interface InscritosClientProps {
  initialInscripciones: any[];
}

export function InscritosClient({ initialInscripciones }: InscritosClientProps) {
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

  const handleManualSend = async (insc: any) => {
    setSendingId(insc.id);
    try {
      const { automationService } = await import("@/services/automationService");
      const result = await automationService.triggerIndividualCertificate(
        insc.evento_id, 
        insc.persona_id,
        insc.ultimoEnvio?.estado_envio === 'error' ? 'reintento' : 'manual'
      );

      if (result.ok) {
        toast({ title: "Envío iniciado", description: result.message });
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
              <TableHead className="font-bold text-slate-600 dark:text-slate-300 h-14 pl-6">Nombre / Doc.</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Correo</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Evento</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Sesiones</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Certificado</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300 pr-6">Acción</TableHead>
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
                      <div className="font-bold text-slate-800 dark:text-slate-100 italic">
                        {persona?.nombre_completo || `${persona?.nombres || ''} ${persona?.apellidos || ''}`.trim() || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {persona?.tipo_documento} {persona?.numero_documento}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{persona?.correo}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase">
                      {evento?.titulo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {insc.sesionesAsistidas} / {evento?.min_sesiones_certificado || 0}
                      </div>
                      <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${insc.sesionesAsistidas >= (evento?.min_sesiones_certificado || 0) ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(100, (insc.sesionesAsistidas / (evento?.min_sesiones_certificado || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {/* Cumplimiento Sessions */}
                      {insc.sesionesAsistidas >= (evento?.min_sesiones_certificado || 0) ? (
                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-100 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> CUMPLE REQUISITO
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold bg-slate-50 text-slate-500 border-slate-100 flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" /> NO CUMPLE
                        </Badge>
                      )}
                      
                      {/* Manual Habilitation */}
                      {insc.habilitadoManual && (
                        <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 w-fit">
                          <Award className="w-3 h-3" /> HABILITADO MANUAL
                        </Badge>
                      )}

                      {/* Send Status */}
                      {insc.ultimoEnvio && (
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] font-bold border-0 flex items-center gap-1 w-fit px-2 py-0.5 rounded-md ${
                            insc.ultimoEnvio.estado_envio === 'enviado' ? 'bg-emerald-600 text-white' : 
                            insc.ultimoEnvio.estado_envio === 'error' ? 'bg-rose-600 text-white' : 
                            'bg-slate-500 text-white'
                          }`}
                        >
                          {insc.ultimoEnvio.estado_envio === 'enviado' ? <CheckCircle2 className="w-3 h-3" /> : 
                           insc.ultimoEnvio.estado_envio === 'error' ? <XCircle className="w-3 h-3" /> : null}
                          {insc.ultimoEnvio.estado_envio?.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6">
                    {insc.ultimoEnvio?.estado_envio !== 'enviado' && (
                      <Button
                        size="sm"
                        variant={insc.ultimoEnvio?.estado_envio === 'error' ? "outline" : "secondary"}
                        className={`h-8 gap-2 text-[10px] font-bold uppercase transition-all active:scale-95 ${
                          insc.ultimoEnvio?.estado_envio === 'error' ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        onClick={() => handleManualSend(insc)}
                        disabled={sendingId === insc.id}
                      >
                        {sendingId === insc.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : insc.ultimoEnvio?.estado_envio === 'error' ? (
                          <RotateCcw className="w-3 h-3" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        {sendingId === insc.id ? "..." : (insc.ultimoEnvio?.estado_envio === 'error' ? "Reintentar" : "Enviar")}
                      </Button>
                    )}
                    {insc.ultimoEnvio?.estado_envio === 'enviado' && (
                      <div className="flex justify-start">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
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
