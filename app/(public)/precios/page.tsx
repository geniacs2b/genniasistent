"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LeadModal } from "@/components/LeadModal";
import { PlanCard } from "@/components/PlanCard";
import { PLANS } from "@/lib/planConfig";
import type { PlanKey } from "@/lib/planConfig";

const LEAD_LABELS: Record<PlanKey, string> = {
  starter:    "Comenzar con Starter",
  pro:        "Obtener Plan Pro",
  enterprise: "Hablar con ventas",
};

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 selection:bg-primary/20 pt-16">
      {/* Navbar Pública */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 transition-all">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center">
              <img
                src="/assets/Logo asistencia.png"
                alt="Logo GenniAsistent"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tighter text-slate-800 dark:text-slate-100 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-700 hover:text-primary transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/registro">
              <Button className="font-bold rounded-xl shadow-md bg-primary hover:bg-primary/90">
                Pruébalo Gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Header */}
        <section className="pt-24 pb-12 text-center px-4 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <div className="container max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Planes simples y escalables{" "}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 italic pr-2">
                para cada organización.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
              Comienza gratis o elige el volumen de certificados que mejor se adapte a las conferencias y eventos de tu empresa.
            </p>

            {/* Billing Toggle — Redesigned for premium feel and no clipping */}
            <div className="flex items-center justify-center pt-10">
              <div className="relative bg-slate-100 border border-slate-200/60 p-1 rounded-2xl flex items-center shadow-sm">
                {/* Switch Background Slider */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-[14px] shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isAnnual ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`relative z-10 px-8 py-2.5 text-[13px] font-bold rounded-[14px] transition-colors whitespace-nowrap ${
                    !isAnnual ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Mensual
                </button>
                
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`relative z-10 px-8 py-2.5 text-[13px] font-bold rounded-[14px] transition-colors whitespace-nowrap flex items-center gap-2 ${
                    isAnnual ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Anual
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    -15%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards — grid idéntico al original */}
        <section className="py-12 px-4 pb-24">
          <div className="container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const label = LEAD_LABELS[plan.key];
              const isEnterprise = plan.key === "enterprise";

              const action = (
                <LeadModal defaultPlan={plan.key} fuente="precios">
                  <Button
                    variant={plan.dark ? "default" : "outline"}
                    className={
                      plan.dark
                        ? "w-full rounded-xl h-14 font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
                        : "w-full rounded-xl h-14 font-bold text-slate-700 bg-white border-slate-200 hover:bg-primary/5 hover:border-primary/30 hover:text-primary group transition-colors"
                    }
                  >
                    {label}
                    {isEnterprise && (
                      <ArrowRight className="ml-2 w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    )}
                  </Button>
                </LeadModal>
              );

              return (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  isAnnual={isAnnual}
                  action={action}
                />
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer único — unificado con estética premium */}
      <footer className="bg-white border-t border-slate-100 mt-20">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          {/* Links legales */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mb-8">
            <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Términos de uso</Link>
            <div className="hidden sm:block w-px h-4 bg-slate-200 self-center" />
            <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Privacidad</Link>
            <div className="hidden sm:block w-px h-4 bg-slate-200 self-center" />
            <Link href="#" className="text-[13px] font-semibold text-slate-400 hover:text-primary transition-colors">Soporte corporativo</Link>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <img src="/assets/logo-gennia.png" alt="GENNIA" className="h-5 w-auto object-contain opacity-70" />
              <span className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-700">Desarrollado por GENNIA</span>
            </div>
            <p className="text-[12px] text-slate-400 font-medium">
              © {new Date().getFullYear()} GenniAsistent. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
