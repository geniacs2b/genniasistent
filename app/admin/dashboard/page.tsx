import { adminDashboardService } from "@/services/adminDashboardService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, MailWarning, CalendarCheck2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const metrics = await adminDashboardService.getDashboardMetrics();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Dashboard General
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
          Resumen en tiempo real de tu plataforma integral de eventos corporativos.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Eventos Activos
            </CardTitle>
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {metrics.totalEventos}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Eventos creados</p>
          </CardContent>
        </Card>
        
        {/* Metric 2 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Total Inscritos
            </CardTitle>
            <div className="h-10 w-10 bg-sky-50 dark:bg-sky-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
               {metrics.totalInscritos}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Personas registradas</p>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              E-mails Pendientes
            </CardTitle>
            <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
              <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {metrics.correosPendientes}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Verificaciones en cola</p>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[1.25rem]">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Asistencias Confirmadas
            </CardTitle>
            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
               {metrics.totalAsistencias}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Asistentes validados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
