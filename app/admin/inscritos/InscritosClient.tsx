"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatToBogota } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

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

  // Extraer eventos únicos para el filtro
  const eventos = Array.from(
    new Set(initialInscripciones.map((insc) => insc.eventos?.titulo))
  ).filter(Boolean);

  const filteredInscripciones = initialInscripciones.filter((insc) => {
    if (selectedEvento === "all") return true;
    return insc.eventos?.titulo === selectedEvento;
  });

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
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Registro</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Correo Verif.</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300 pr-6">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInscripciones.map((insc) => {
              const persona = insc.personas as any;
              const evento = insc.eventos as any;
              return (
                <TableRow key={insc.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-primary/5 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{persona?.tipo_documento} {persona?.numero_documento}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{persona?.correo}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Badge variant="outline" className="border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase">
                      {evento?.titulo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-500">
                    {formatToBogota(insc.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={persona?.correo_verificado ? "default" : "destructive"} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${persona?.correo_verificado ? "bg-emerald-100 text-emerald-700 border-0" : "bg-rose-100 text-rose-700 border-0"}`}>
                      {persona?.correo_verificado ? "V E R I F I C A D O" : "P E N D I E N T E"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    <Badge variant={estadoBadge[insc.estado] ?? "secondary"} className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize">
                      {insc.estado?.replace(/_/g, " ")}
                    </Badge>
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
