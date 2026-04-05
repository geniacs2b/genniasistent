import { createClient } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { 
  Settings2, 
  AlertCircle, 
  ExternalLink, 
  Globe, 
  QrCode, 
  Plus, 
  Search,
  Layout
} from "lucide-react";
import { CopyUrlButton } from "@/components/CopyUrlButton";
import { GenerateQrButton } from "@/components/GenerateQrButton";
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
    <div className="max-w-[1240px] mx-auto space-y-10 sm:space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.02)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Captación de participantes</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50 italic">
            Inscripciones de Eventos
          </h1>
          <p className="text-[17px] font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Gestiona formularios, enlaces públicos y el acceso de participantes en tiempo real desde un centro de control unificado.
          </p>
        </div>
        
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 self-center">
            <div className="flex -space-x-3">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {i}
                 </div>
               ))}
            </div>
            <span className="text-xs font-bold text-slate-500 mr-2">Control Activo</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 p-6 text-sm text-rose-600 font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          Error cargando eventos: {error.message}
        </div>
      )}

      {/* Grid de Eventos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
        {(eventos || []).map((ev) => {
          const formulario = ev.formularios?.[0] as any;
          
          return (
            <div key={ev.id} className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/50 dark:border-slate-800 shadow-[0_4px_24px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-1.5 flex flex-col h-full overflow-hidden">
              
              {/* Decorative Accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-slate-100 dark:via-slate-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

              <div className="p-8 flex flex-col h-full space-y-6">
                {/* Header Evento */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors duration-500">
                        <Layout className="w-6 h-6" />
                    </div>
                    {formulario ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 pointer-events-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-in fade-in zoom-in-95 duration-500 h-7 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                        Activo para inscripciones
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 h-7 flex items-center italic">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {ev.titulo}
                  </h3>
                </div>

                {/* Sección Acceso */}
                {formulario && (
                  <div className="bg-slate-50/50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-4 transition-colors group-hover:border-indigo-100/50 dark:group-hover:border-indigo-500/10">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      <Globe className="w-3.5 h-3.5" />
                      Acceso Público
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <CopyUrlButton slug={formulario.slug} />
                      <GenerateQrButton slug={formulario.slug} eventName={ev.titulo} />
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="mt-auto pt-4 flex flex-col gap-3">
                  {formulario ? (
                    <>
                      <Link href={`/app/formularios/${formulario.id}`} className="w-full">
                        <Button className="w-full h-12 px-6 gap-2 text-sm font-black bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white border-0 rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 dark:shadow-indigo-500/10 transition-all hover:-translate-y-0.5 active:scale-95 italic">
                          <Settings2 className="w-4 h-4 transition-transform group-hover:rotate-180 duration-700" />
                          Configurar Campos
                        </Button>
                      </Link>
                      <Link href={`/inscripcion/${formulario.slug}`} target="_blank" className="w-full">
                        <Button variant="outline" className="w-full h-12 px-6 gap-2 text-sm font-bold border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300 rounded-xl transition-all active:scale-95">
                          <ExternalLink className="w-4 h-4" />
                          Ver Formulario
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <div className="w-full">
                       <CreateFormButton eventoId={ev.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State / New Event */}
        {(eventos || []).length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6 bg-white dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="h-24 w-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner">
              <AlertCircle className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center space-y-2">
                <p className="text-slate-900 dark:text-slate-100 text-2xl font-black italic">No hay registros</p>
                <p className="text-slate-400 text-base font-medium">Comienza creando tu primer evento para gestionar inscripciones.</p>
            </div>
            <Link href="/app/eventos/nuevo">
              <Button className="h-14 px-10 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 gap-3 italic">
                <Plus className="w-6 h-6" strokeWidth={3} />
                Crear mi primer evento
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
