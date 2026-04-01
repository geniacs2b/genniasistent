"use client";

import { useState, useTransition } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Sparkles, Building2, Mail, Phone, MessageSquare } from "lucide-react";
import { createLeadAction, type LeadPlan } from "@/app/actions/leadActions";

const PLAN_LABELS: Record<LeadPlan, { label: string; color: string; emoji: string }> = {
  starter:    { label: "Starter",    color: "bg-slate-100 text-slate-700 border-slate-200",       emoji: "🌱" },
  pro:        { label: "Pro SaaS",   color: "bg-primary/10 text-primary border-primary/20",        emoji: "🚀" },
  enterprise: { label: "Enterprise", color: "bg-violet-50 text-violet-700 border-violet-200",      emoji: "🏢" },
};

interface LeadModalProps {
  defaultPlan?: LeadPlan;
  fuente?: string;
  children: React.ReactNode;  // trigger element
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
      // Reset al cerrar
      setTimeout(() => {
        setSuccess(false);
        setErrorMsg(null);
        setForm({ nombre: "", empresa: "", email: "", whatsapp: "", mensaje: "" });
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Trigger: cualquier elemento que se pase como children */}
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {children}
      </span>

      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden rounded-[1.75rem] border border-slate-200/60 shadow-2xl">
        {/* Top gradient stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-emerald-400 to-primary" />

        {!success ? (
          <>
            <DialogHeader className="px-8 pt-7 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-slate-900 leading-tight">
                    Consultar Plan
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500 font-medium mt-0.5">
                    Te contactamos en menos de 24 horas hábiles.
                  </DialogDescription>
                </div>
              </div>
              {/* Plan badge */}
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${planInfo.color}`}>
                  <span>{planInfo.emoji}</span> Plan {planInfo.label} seleccionado
                </span>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-2 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  Nombre completo <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <Input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Carlos Bastidas"
                    required
                    className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Empresa + Email — 2 cols */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    Empresa / Institución
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      name="empresa"
                      value={form.empresa}
                      onChange={handleChange}
                      placeholder="Tu empresa"
                      className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    Correo electrónico <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@empresa.com"
                      required
                      className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  WhatsApp <span className="text-slate-400 font-normal normal-case">(opcional, para respuesta rápida)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="+57 300 000 0000"
                    className="pl-9 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Mensaje */}
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  ¿Qué necesitas? <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                </Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <Textarea
                    name="mensaje"
                    value={form.mensaje}
                    onChange={handleChange}
                    placeholder="Cuéntanos cuántos certificados emites, el tamaño de tu equipo, o cualquier duda..."
                    rows={3}
                    className="pl-9 pt-3 rounded-xl border-slate-200 bg-slate-50 focus:bg-white font-medium text-slate-800 resize-none"
                  />
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2 transition-all hover:-translate-y-0.5 mt-1"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando consulta...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Enviar Consulta</>
                )}
              </Button>

              <p className="text-center text-[11px] text-slate-400 font-medium">
                Sin spam. Tu información está protegida y nunca se comparte con terceros.
              </p>
            </form>
          </>
        ) : (
          /* ── Estado de éxito ─────────────────────────────────── */
          <div className="px-8 py-12 flex flex-col items-center text-center gap-5">
            <div className="h-20 w-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">¡Consulta recibida!</h3>
              <p className="text-slate-500 font-medium mt-2 max-w-sm">
                Nuestro equipo revisará tu solicitud para el plan{" "}
                <span className="font-bold text-primary">{planInfo.label}</span> y te contactará en las próximas 24 horas hábiles.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${planInfo.color}`}>
              {planInfo.emoji} Plan {planInfo.label} — Pendiente de contacto
            </div>
            <Button
              variant="outline"
              className="mt-2 rounded-xl font-bold border-slate-200 hover:bg-slate-50"
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
