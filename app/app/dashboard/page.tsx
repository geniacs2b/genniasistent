import { adminDashboardService } from "@/services/adminDashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, AlertTriangle, CheckCircle2, ShieldCheck, Mail, ArrowRight, FileImage, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const metrics = await adminDashboardService.getDashboardMetrics();

  const isUnlimited = metrics.cuotaDisponible >= 100000;
  const porcentajeConsumido = isUnlimited ? 0 : Math.min(100, Math.round((metrics.certificadosEmitidos / (metrics.certificadosEmitidos + metrics.cuotaDisponible)) * 100));

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 italic">
            Resumen Operativo
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 mb-2 px-1">
            Supervisa el rendimiento, la emisión y el estado de tu suscripción.
          </p>
        </div>
        
        <div className="flex gap-3">
           <Link href="/app/eventos/nuevo" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 px-4 py-2 bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 gap-2">
             <CalendarDays className="w-4 h-4" /> Nuevo Evento
           </Link>
           <Link href="/app/plantillas" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 h-10 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
             <FileImage className="w-4 h-4" /> Diseñar Plantilla
           </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Certificados */}
        <Card className="relative overflow-hidden border border-slate-200/40 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[3px] transition-all duration-300 bg-white dark:bg-slate-900 rounded-[1.25rem] group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Certificados Emitidos
            </CardTitle>
            <div className="h-9 w-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-transform group-hover:scale-105">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.certificadosEmitidos.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">Histórico generado con éxito</p>
          </CardContent>
        </Card>
        
        {/* Metric 2: Cuota */}
        <Card className="relative overflow-hidden border border-slate-200/40 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[3px] transition-all duration-300 bg-white dark:bg-slate-900 rounded-[1.25rem] group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Cuota Disponible
            </CardTitle>
            <div className="h-9 w-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-transform group-hover:scale-105">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
               {isUnlimited ? "∞ Ilimitado" : metrics.cuotaDisponible.toLocaleString()}
            </div>
            {!isUnlimited && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${porcentajeConsumido}%` }}></div>
                </div>
            )}
            <p className="text-[11px] text-slate-500 mt-2 font-medium">{porcentajeConsumido}% del plan consumido</p>
          </CardContent>
        </Card>

        {/* Metric 3: Errores */}
        <Card className="relative overflow-hidden border border-slate-200/40 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[3px] transition-all duration-300 bg-white dark:bg-slate-900 rounded-[1.25rem] group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Errores de Emisión
            </CardTitle>
            <div className="h-9 w-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-transform group-hover:scale-105">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.errores}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">Jobs fallidos detectados</p>
          </CardContent>
        </Card>

        {/* Metric 4: Correo */}
        <Card className="relative overflow-hidden border border-slate-200/40 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[3px] transition-all duration-300 bg-white dark:bg-slate-900 rounded-[1.25rem] group">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Gateway de Correos
            </CardTitle>
            <div className="h-9 w-9 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-transform group-hover:scale-105">
              < Mail className={`w-4.5 h-4.5 ${metrics.correoConectado ? 'text-emerald-500' : 'text-rose-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 tracking-tight pt-1">
               <span className={`h-2.5 w-2.5 rounded-full ${metrics.correoConectado ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'} ${metrics.correoConectado ? 'animate-pulse' : ''}`}></span>
               {metrics.correoConectado ? "Conectado" : "Desconectado"}
            </div>
            <p className="text-[11px] text-slate-500 mt-3 font-medium">Estado del buzón corporativo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lotes de Emisión */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-2xl p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 italic tracking-tight">Lotes de Emisión</h3>
                <p className="text-[12px] text-slate-500 font-medium mt-1">Últimas operaciones procesadas</p>
              </div>
              <Link href="/app/monitoreo" className="text-[13px] text-primary font-bold flex items-center hover:opacity-80 transition-opacity">
                 Ver historial <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
           </div>
           
           <div className="space-y-4">
              {metrics.lotesRecientes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                     <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
                     <p className="text-sm font-medium">Aún no hay lotes registrados</p>
                  </div>
              ) : (
                  metrics.lotesRecientes.map(lote => (
                      <div key={lote.id} className="group p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-none">
                          <div className="flex items-start justify-between mb-4">
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Lote</span>
                                      <code className="text-[13px] font-bold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                          #{lote.id.split('-')[0]}
                                      </code>
                                  </div>
                                  <p className="text-[12px] text-slate-500 font-medium">
                                      {dayjs(lote.created_at).locale("es").format("DD MMM YYYY · HH:mm")}
                                  </p>
                              </div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  lote.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  lote.status === 'processing' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                  {lote.status === 'completed' ? '✔ Completado' : lote.status === 'processing' ? '● Procesando' : 'Pendiente'}
                              </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                              <div>
                                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Certificados</p>
                                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                                      {lote.total_expected} <span className="text-[11px] font-medium text-slate-400 normal-case">enviados</span>
                                  </p>
                              </div>
                              <div className="text-right">
                                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Tiempo</p>
                                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                                      2.3s <span className="text-[11px] font-medium text-slate-400 normal-case">aprox.</span>
                                  </p>
                              </div>
                          </div>
                      </div>
                  ))
              )}
           </div>
        </div>

        {/* Atajos de Operación */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-2xl p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
           <div className="mb-8">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 italic tracking-tight">Atajos de Operación</h3>
              <p className="text-[12px] text-slate-500 font-medium mt-1">Acciones rápidas para tu flujo diario</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Link href="/app/eventos" className="group flex flex-col items-start p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:bg-slate-800 transition-all duration-300">
                 <div className="h-12 w-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                     <CalendarDays className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-extrabold text-[15px] text-slate-900 dark:text-slate-200 tracking-tight">Gestionar Eventos</span>
                 <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">Crea o edita webinars, cursos y foros de manera masiva.</p>
              </Link>
              
              <Link href="/app/participantes" className="group flex flex-col items-start p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:bg-slate-800 transition-all duration-300">
                 <div className="h-12 w-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                     <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-extrabold text-[15px] text-slate-900 dark:text-slate-200 tracking-tight">Base de Participantes</span>
                 <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">Directorio unificado de estudiantes y asistentes inscritos.</p>
              </Link>
 
              <Link href="/app/monitoreo" className="group flex flex-col items-start p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:bg-slate-800 transition-all duration-300">
                 <div className="h-12 w-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                     <FileText className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-extrabold text-[15px] text-slate-900 dark:text-slate-200 tracking-tight">Monitor de Emisión</span>
                 <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">Revisa en tiempo real el % de PDFs generados y enviados.</p>
              </Link>
 
              <Link href="/app/correos" className="group flex flex-col items-start p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:bg-slate-800 transition-all duration-300">
                 <div className="h-12 w-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm border border-slate-200/50 dark:border-slate-600 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                     <Mail className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-extrabold text-[15px] text-slate-900 dark:text-slate-200 tracking-tight">Buzón de Salida</span>
                 <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-relaxed">Configura tus cuentas corporativas de GMail o SMTP.</p>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
