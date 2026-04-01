import { adminDashboardService } from "@/services/adminDashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, AlertTriangle, CheckCircle2, ShieldCheck, Mail, ArrowRight, FileImage, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const metrics = await adminDashboardService.getDashboardMetrics();

  const isTrial     = metrics.billingStatus !== "active";
  const isUnlimited = metrics.cuotaDisponible >= 100000;
  const porcentajeConsumido = isUnlimited ? 0 : Math.min(100, Math.round((metrics.certificadosEmitidos / (metrics.certificadosEmitidos + metrics.cuotaDisponible)) * 100));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Resumen Operativo
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            Supervisa el rendimiento de tu plataforma, la emisión de certificados y el estado de tu suscripción.
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

      {/* ── Banner de prueba gratuita ──────────────────────────── */}
      {isTrial && (
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-900">Estás en período de prueba gratuito</p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Tienes {metrics.cuotaDisponible} certificado{metrics.cuotaDisponible !== 1 ? "s" : ""} disponible{metrics.cuotaDisponible !== 1 ? "s" : ""}. Actualiza tu plan para ampliar tu cuota.
              </p>
            </div>
          </div>
          <Link
            href="/app/billing"
            className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Ver planes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Certificados Emitidos
            </CardTitle>
            <div className="h-10 w-10 bg-primary/10 dark:bg-primary/5 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {metrics.certificadosEmitidos.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Histórico generado con éxito</p>
          </CardContent>
        </Card>
        
        {/* Metric 2 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Cuota Disponible
            </CardTitle>
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
               {isUnlimited ? "∞ Ilimitado" : metrics.cuotaDisponible.toLocaleString()}
            </div>
            {!isUnlimited && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${porcentajeConsumido}%` }}></div>
                </div>
            )}
            <p className="text-xs text-slate-400 mt-1 font-medium">{porcentajeConsumido}% de tu plan consumido</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Errores de Emisión
            </CardTitle>
            <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {metrics.errores}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Jobs fallidos que requieren atención</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className={`absolute top-0 left-0 w-full h-1 ${metrics.correoConectado ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Gateway de Correos
            </CardTitle>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${metrics.correoConectado ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
              <Mail className={`w-5 h-5 ${metrics.correoConectado ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               {metrics.correoConectado ? "Conectado" : "Desconectado"}
               {metrics.correoConectado && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Permite el envío automático de PDFs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lotes Recientes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Lotes de Emisión Recientes</h3>
              <Link href="/app/monitoreo" className="text-sm text-primary font-medium flex items-center hover:underline">
                 Ver todos <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
           </div>
           
           <div className="space-y-4">
              {metrics.lotesRecientes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                     Aún no tienes lotes de emisión. Acércate a "Monitoreo" luego de tu primer evento.
                  </div>
              ) : (
                  metrics.lotesRecientes.map(lote => (
                      <div key={lote.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors hover:border-slate-200">
                          <div>
                              <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                  Lote <span className="text-xs font-mono text-slate-400">{lote.id.split('-')[0]}</span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">{dayjs(lote.created_at).locale("es").format("DD/MMM/YYYY HH:mm")}</p>
                          </div>
                          <div className="flex flex-col items-end">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  lote.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                  lote.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-800'
                              }`}>
                                  {lote.status === 'completed' ? 'Completado' : lote.status === 'processing' ? 'En Proceso' : 'Pendiente'}
                              </span>
                              <p className="text-[11px] text-slate-400 mt-1 font-medium">{lote.total_expected} cértificados esperados</p>
                          </div>
                      </div>
                  ))
              )}
           </div>
        </div>

        {/* Accessos Rápidos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Atajos de Operación</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <Link href="/app/eventos" className="flex flex-col items-start p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors group">
                 <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600 mb-3 group-hover:scale-105 transition-transform">
                     <CalendarDays className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Gestionar Eventos</span>
                 <p className="text-xs text-slate-500 mt-1">Crea o edita webinars, cursos y foros.</p>
              </Link>
              
              <Link href="/app/participantes" className="flex flex-col items-start p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors group">
                 <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600 mb-3 group-hover:scale-105 transition-transform">
                     <Users className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Base de Participantes</span>
                 <p className="text-xs text-slate-500 mt-1">Directorio de estudiantes inscritos.</p>
              </Link>

              <Link href="/app/monitoreo" className="flex flex-col items-start p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors group">
                 <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600 mb-3 group-hover:scale-105 transition-transform">
                     <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Monitor de Emisión</span>
                 <p className="text-xs text-slate-500 mt-1">Revisa el % de PDFs generados.</p>
              </Link>

              <Link href="/app/correos" className="flex flex-col items-start p-5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors group">
                 <div className="h-10 w-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-600 mb-3 group-hover:scale-105 transition-transform">
                     <Mail className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                 </div>
                 <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Buzón de Salida</span>
                 <p className="text-xs text-slate-500 mt-1">Configura GMail o SMTP para envíos.</p>
              </Link>

           </div>
        </div>

      </div>
    </div>
  );
}
