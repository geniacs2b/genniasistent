import { createClient } from "@/lib/supabaseServer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Settings2, AlertCircle, ExternalLink } from "lucide-react";
import { CreateFormButton } from "./CreateFormButton";

export const dynamic = 'force-dynamic';

export default async function FormulariosPage() {
  const supabase = createClient();
  
  // Obtener todos los eventos y sus formularios vinculados
  const { data: eventos, error } = await supabase
    .from("eventos")
    .select(`
      id, 
      titulo, 
      formularios (
        id,
        slug,
        descripcion
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Gestión de Inscripciones</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            Configura y comparte los formularios de inscripción de tus eventos.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-600 font-medium border border-rose-200 dark:border-rose-800">
          Error cargando eventos: {error.message}
        </div>
      )}

      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
            <TableRow className="border-b border-slate-100 dark:border-slate-800 hover:bg-transparent">
              <TableHead className="font-bold text-slate-600 dark:text-slate-300 h-14">Evento y URL Pública</TableHead>
              <TableHead className="font-bold text-slate-600 dark:text-slate-300">Estado</TableHead>
              <TableHead className="text-right font-bold text-slate-600 dark:text-slate-300 pr-6">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(eventos || []).map((ev) => {
              const formulario = ev.formularios?.[0] as any;
              
              return (
                <TableRow key={ev.id} className="border-b border-slate-100/50 dark:border-slate-800/50 hover:bg-primary/10 dark:hover:bg-slate-800/50 transition-colors group">
                  <TableCell className="py-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="space-y-1">
                      <div className="text-base">{ev.titulo}</div>
                      {formulario && (
                        <div className="flex items-center gap-2 mt-1">
                           <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
                            /inscripcion/{formulario.slug}
                          </code>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formulario ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 border-0 pointer-events-none px-3 py-1 rounded-full text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                        LISTO PARA RECIBIR
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                        PENDIENTE
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                      {formulario && (
                        <Link href={`/inscripcion/${formulario.slug}`} target="_blank">
                          <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-sm font-bold border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            Ver Formulario
                          </Button>
                        </Link>
                      )}
                      {formulario ? (
                        <Link href={`/admin/formularios/${formulario.id}`}>
                          <Button size="sm" className="h-10 px-4 gap-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-secondary border-0 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                            <Settings2 className="w-4 h-4" />
                            Configurar Campos
                          </Button>
                        </Link>
                      ) : (
                        <CreateFormButton eventoId={ev.id} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {(eventos || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-base font-medium">No hay eventos registrados.</p>
                    <Link href="/admin/eventos/nuevo">
                      <Button variant="outline" className="mt-2 h-10 px-6 rounded-xl font-bold">Crear mi primer evento</Button>
                    </Link>
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
