import { createClient } from "@/lib/supabaseServer";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatToBogota } from "@/lib/date";
import { InscritosActions } from "./InscritosActions";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

const estadoBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pendiente_verificacion: "destructive",
  inscrito: "secondary",
  confirmado: "default",
  asistio: "default",
  aprobado: "default",
  certificado_generado: "outline",
  enviado: "outline",
};

export default async function InscritosPage() {
  const supabase = createClient();

  // Obtener inscripciones con join a personas
  const { data: inscripciones, error } = await supabase
    .from("inscripciones")
    .select(`
      id,
      estado,
      created_at,
      personas (
        id,
        tipo_documento,
        numero_documento,
        correo,
        correo_verificado
      ),
      eventos (
        titulo
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Inscritos</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">Lista general de todos los participantes registrados en el sistema.</p>
        </div>
        <InscritosActions inscripciones={inscripciones || []} />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-600 font-medium border border-rose-200 dark:border-rose-800">
          Error al cargar inscritos: {error?.message}
        </div>
      )}

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
            {(inscripciones || []).map((insc) => {
              const persona = insc.personas as any;
              const evento = insc.eventos as any;
              return (
                <TableRow key={insc.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{persona?.tipo_documento} {persona?.numero_documento}</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{persona?.correo}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{evento?.titulo}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-500">
                    {formatToBogota(insc.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={persona?.correo_verificado ? "default" : "destructive"} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${persona?.correo_verificado ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0" : "bg-rose-100 text-rose-700 hover:bg-rose-200 border-0"}`}>
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
            {(inscripciones || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 font-medium py-20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span>No hay inscritos aún.</span>
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
