"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatToBogota } from "@/lib/date";

interface ParticipantesActionsProps {
  inscripciones: any[];
}

export function ParticipantesActions({ inscripciones }: ParticipantesActionsProps) {
  const exportCSV = () => {
    const headers = ["Tipo Doc", "Número Doc", "Correo", "Correo Verificado", "Evento", "Estado", "Fecha Registro"];
    const rows = inscripciones.map((insc) => {
      const p = insc.personas;
      const ev = insc.eventos;
      return [
        p?.tipo_documento,
        p?.numero_documento,
        p?.correo,
        p?.correo_verificado ? "Sí" : "No",
        ev?.titulo,
        insc.estado_db,
        insc.created_at ? formatToBogota(insc.created_at, { day: '2-digit', month: '2-digit', year: 'numeric' }) : "",
      ].map((v) => `"${v ?? ""}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscritos_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button 
      variant="outline" 
      className="gap-2.5 h-11 px-5 rounded-xl font-bold border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300 shadow-sm group active:scale-95" 
      onClick={exportCSV}
    >
      <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
      Exportar a CSV
    </Button>
  );
}
