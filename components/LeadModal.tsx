"use client";

import { useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, Loader2, Building2, Mail, Phone,
  MessageSquare, ArrowRight, Shield, User,
} from "lucide-react";
import { createLeadAction, type LeadPlan } from "@/app/actions/leadActions";

// ─── Plan metadata ─────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<LeadPlan, { label: string; color: string; dot: string }> = {
  starter:    { label: "Starter",    color: "bg-slate-100 text-slate-600 border-slate-200",        dot: "bg-slate-400" },
  pro:        { label: "Pro",        color: "bg-primary/8 text-primary border-primary/20",          dot: "bg-primary" },
  enterprise: { label: "Enterprise", color: "bg-violet-50 text-violet-700 border-violet-200/60",    dot: "bg-violet-500" },
};

// ─── Shared input style ────────────────────────────────────────────────────────
const inputCls =
  "pl-10 h-12 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 placeholder-slate-400 " +
  "text-[13.5px] font-medium transition-all duration-200 " +
  "hover:border-slate-300 hover:bg-white " +
  "focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:outline-none";

interface LeadModalProps {
  defaultPlan?: LeadPlan;
  fuente?: string;
  children: React.ReactNode;
}

export function LeadModal({ defaultPlan = "pro", fuente = "precios", children }: LeadModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre:   "",
    empresa:  "",
    email:    "",
    whatsapp: "",
    mensaje:  "",
  });

  const planInfo = PLAN_LABELS[defaultPlan];

  // ── Handlers (sin cambios funcionales) ──────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const result = await createLeadAction({
        ...form,
        plan: defaultPlan,
        fuente,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setErrorMsg(result.error ?? "Error inesperado. Intenta de nuevo.");
      }
    });
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setTimeout(() => {
        setSuccess(false);
        setErrorMsg(null);
        setForm({ nombre: "", empresa: "", email: "", whatsapp: "", mensaje: "" });
      }, 300);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {children}
      </span>

      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden rounded-[1.75rem] border border-slate-200/50 shadow-2xl shadow-slate-900/10 gap-0">

        {/* ── Top accent bar ───────────────────────────────────────────────── */}
        <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 via-primary to-emerald-500" />

        {!success ? (
          <>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <DialogHeader className="px-8 pt-8 pb-0">
              {/* Icon + Title row */}
              <div className="flex items-start gap-4 mb-4">
                <div className="h-11 w-11 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 pt-0.5">
                  <DialogTitle className="text-[19px] font-extrabold text-slate-900 tracking-tight leading-tight">
                    Solicitar plan Enterprise
                  </DialogTitle>
                  <DialogDescription className="text-[13.5px] text-slate-500 font-medium mt-1 leading-relaxed">
                    Cuéntanos tu volumen, tamaño de equipo y necesidades operativas. Te respondemos en menos de 24 horas hábiles.
                  </DialogDescription>
                </div>
              </div>

              {/* Plan badge */}
              <div className="flex items-center gap-2 pb-5 border-b border-slate-100">
                <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full border tracking-wide ${planInfo.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${planInfo.dot}`} />
                  Plan {planInfo.label} seleccionado
                </span>
              </div>
            </DialogHeader>

            {/* ── Form ────────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="px-8 pt-5 pb-7 space-y-4">

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                  Nombre completo <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Carlos Bastidas"
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Empresa + Email — 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                    Empresa / Institución
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      name="empresa"
                      value={form.empresa}
                      onChange={handleChange}
                      placeholder="Tu empresa"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                    Correo <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@empresa.com"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <Label className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-slate-500">
                  WhatsApp{" "}
                  <span className="normal-case font-normal text-slate-400 tracking-normal">(opcional — para respuesta rápida)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="+57 300 000 0000"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Mensaje — briefing comercial */}
              <div className="space-y-1.5">
                <Label className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Brief comercial{" "}
                  <span className="normal-case font-normal text-slate-400 tracking-normal">(opcional)</span>
                </Label>
                <Textarea
                  name="mensaje"
                  value={form.mensaje}
                  onChange={handleChange}
                  placeholder="Ej.: volumen mensual de certificados, tamaño del equipo, uso corporativo, dominio propio, soporte requerido o integraciones necesarias."
                  rows={4}
                  className={
                    "rounded-xl border border-slate-200 bg-slate-50/60 text-[13.5px] font-medium text-slate-800 " +
                    "placeholder-slate-400 pt-3.5 px-4 resize-none leading-relaxed " +
                    "transition-all duration-200 hover:border-slate-300 hover:bg-white " +
                    "focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10 focus:outline-none"
                  }
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200/60 text-rose-700 text-[13px] font-medium px-4 py-3 rounded-xl">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-13 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20 gap-2.5 transition-all duration-200 hover:-translate-y-px text-[14.5px] mt-1"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando solicitud...</>
                ) : (
                  <>Enviar solicitud comercial <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              {/* Legal microcopy */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <Shield className="w-3 h-3 text-slate-400 shrink-0" />
                <p className="text-center text-[11px] text-slate-400 font-medium">
                  Sin spam. Tu información está protegida y nunca se comparte con terceros.
                </p>
              </div>
            </form>
          </>
        ) : (
          /* ── Success state ───────────────────────────────────────────────── */
          <div className="px-8 py-14 flex flex-col items-center text-center gap-5">
            <div className="h-20 w-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100/60">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-[22px] font-extrabold text-slate-900 tracking-tight">¡Solicitud recibida!</h3>
              <p className="text-[14px] text-slate-500 font-medium mt-2 max-w-sm leading-relaxed">
                Nuestro equipo comercial revisará tu solicitud para el plan{" "}
                <span className="font-bold text-slate-800">{planInfo.label}</span> y te
                contactará en las próximas 24 horas hábiles.
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-full border ${planInfo.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${planInfo.dot}`} />
              Plan {planInfo.label} — Pendiente de contacto
            </span>
            <Button
              variant="outline"
              className="mt-1 rounded-xl font-bold border-slate-200 hover:bg-slate-50 text-slate-700"
              onClick={() => handleOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
