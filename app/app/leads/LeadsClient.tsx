"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLeadEstadoAction, type LeadEstado } from "@/app/actions/leadActions";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Mail, Phone, MessageSquare, Calendar,
  Inbox, RefreshCw, CheckCircle2, XCircle, Sparkles
} from "lucide-react";

type Lead = {
  id: string;
  nombre: string;
  empresa: string | null;
  email: string;
  whatsapp: string | null;
  plan: string;
  mensaje: string | null;
  estado: LeadEstado;
  fuente: string | null;
  created_at: string;
};

const ESTADO_CONFIG: Record<LeadEstado, { label: string; badge: string; icon: React.ReactNode }> = {
  nuevo:      { label: "Nuevo",      badge: "bg-blue-50 text-blue-700 border-blue-200",       icon: <Inbox className="w-3 h-3" /> },
  contactado: { label: "Contactado", badge: "bg-amber-50 text-amber-700 border-amber-200",    icon: <RefreshCw className="w-3 h-3" /> },
  cerrado:    { label: "Cerrado",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const PLAN_CONFIG: Record<string, { label: string; badge: string }> = {
  starter:    { label: "Starter",    badge: "bg-slate-100 text-slate-700 border-slate-300" },
  pro:        { label: "Pro SaaS",   badge: "bg-primary/10 text-primary border-primary/20" },
  enterprise: { label: "Enterprise", badge: "bg-violet-50 text-violet-700 border-violet-200" },
};

const FILTROS = [
  { key: "todos",      label: "Todos",      icon: null },
  { key: "nuevo",      label: "Nuevos",     icon: <Inbox className="w-3.5 h-3.5" /> },
  { key: "contactado", label: "Contactados",icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { key: "cerrado",    label: "Cerrados",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
] as const;

export function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [filtro, setFiltro] = useState<"todos" | LeadEstado>("todos");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleEstadoChange = (id: string, nuevoEstado: LeadEstado) => {
    startTransition(async () => {
      const result = await updateLeadEstadoAction(id, nuevoEstado);
      if (result.success) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l));
        toast({ title: "Estado actualizado" });
      } else {
        toast({ title: "Error al actualizar", description: result.error, variant: "destructive" });
      }
    });
  };

  const filtered = filtro === "todos" ? leads : leads.filter(l => l.estado === filtro);

  // Contadores
  const counts = {
    todos:      leads.length,
    nuevo:      leads.filter(l => l.estado === "nuevo").length,
    contactado: leads.filter(l => l.estado === "contactado").length,
    cerrado:    leads.filter(l => l.estado === "cerrado").length,
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as typeof filtro)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-all ${
              filtro === f.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary/30 hover:text-primary"
            }`}
          >
            {f.icon}
            {f.label}
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-black ${
              filtro === f.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed rounded-[2rem] border-slate-200 bg-slate-50">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
            <Inbox className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-600">Sin leads en esta categoría</p>
          <p className="text-sm text-slate-400 mt-1">Los leads aparecerán aquí cuando alguien complete el formulario.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const estadoInfo = ESTADO_CONFIG[lead.estado];
            const planInfo   = PLAN_CONFIG[lead.plan] ?? { label: lead.plan, badge: "bg-slate-100 text-slate-600 border-slate-200" };
            const fechaHora  = new Date(lead.created_at).toLocaleString("es-CO", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
            });

            return (
              <div
                key={lead.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Avatar inicial */}
                  <div className="hidden lg:flex h-11 w-11 rounded-2xl bg-primary/10 items-center justify-center shrink-0">
                    <span className="font-black text-primary text-lg">
                      {lead.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-base">{lead.nombre}</h3>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${planInfo.badge}`}>
                        {planInfo.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${estadoInfo.badge}`}>
                        {estadoInfo.icon} {estadoInfo.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
                      {lead.empresa && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {lead.empresa}
                        </span>
                      )}
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {lead.email}
                      </a>
                      {lead.whatsapp && (
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 font-medium hover:text-emerald-600 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {lead.whatsapp}
                        </a>
                      )}
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {fechaHora}
                      </span>
                      {lead.fuente && (
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                          Vía: {lead.fuente}
                        </span>
                      )}
                    </div>

                    {lead.mensaje && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="italic leading-relaxed">{lead.mensaje}</p>
                      </div>
                    )}
                  </div>

                  {/* Selector de estado */}
                  <div className="shrink-0 w-full lg:w-44">
                    <Select
                      value={lead.estado}
                      onValueChange={(v) => handleEstadoChange(lead.id, v as LeadEstado)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">
                          <span className="flex items-center gap-2 font-bold text-blue-700">
                            <Inbox className="w-3.5 h-3.5" /> Nuevo
                          </span>
                        </SelectItem>
                        <SelectItem value="contactado">
                          <span className="flex items-center gap-2 font-bold text-amber-700">
                            <RefreshCw className="w-3.5 h-3.5" /> Contactado
                          </span>
                        </SelectItem>
                        <SelectItem value="cerrado">
                          <span className="flex items-center gap-2 font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cerrado
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
