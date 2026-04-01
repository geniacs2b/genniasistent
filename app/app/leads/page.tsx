import { createClient } from "@/lib/supabaseServer";
import { LeadsClient } from "./LeadsClient";
import { Sparkles, TrendingUp, Inbox, CheckCircle2, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-slate-500">
        Error al cargar leads: {error.message}
      </div>
    );
  }

  const all      = leads ?? [];
  const nuevos   = all.filter(l => l.estado === "nuevo").length;
  const contact  = all.filter(l => l.estado === "contactado").length;
  const cerrados = all.filter(l => l.estado === "cerrado").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Gestión de Leads
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
          Prospectos captados desde la página de precios y el panel de suscripción.
        </p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{all.length}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">leads capturados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Inbox className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nuevos</span>
          </div>
          <p className="text-3xl font-black text-blue-600">{nuevos}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">sin contactar</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">En Gestión</span>
          </div>
          <p className="text-3xl font-black text-amber-600">{contact}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">contactados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cerrados</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">{cerrados}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {all.length > 0 ? `${Math.round((cerrados / all.length) * 100)}% conversión` : "—"}
          </p>
        </div>
      </div>

      {/* Lista interactiva */}
      <LeadsClient initialLeads={all} />
    </div>
  );
}
