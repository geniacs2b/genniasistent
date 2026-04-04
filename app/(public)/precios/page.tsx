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
            <Link href="/login">
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

            {/* Early Access Alert */}
            <div className="max-w-2xl mx-auto mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 text-left shadow-sm animate-pulse">
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5 text-amber-600 rotate-[-45deg]" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">
                  Modo Acceso Anticipado
                </p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  Estamos en fase de lanzamiento. Por ahora disfruta de todas las funciones base. Los planes Pro se activarán próximamente.
                </p>
              </div>
            </div>

            {/* Toggle Mensual / Anual */}
            <div className="flex items-center justify-center pt-8">
              <div className="bg-white border border-slate-200 p-1.5 rounded-full inline-flex relative shadow-sm">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors ${
                    !isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pagos Mensuales
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`relative z-10 px-6 py-2.5 text-sm font-bold rounded-full transition-colors ${
                    isAnnual ? "text-white" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pagos Anuales{" "}
                  <span className="text-[10px] ml-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    2 Meses Gratis
                  </span>
                </button>
                {/* Slider background */}
                <div
                  className={`absolute top-1.5 bottom-1.5 w-[50%] bg-primary rounded-full transition-transform duration-300 ease-in-out ${
                    isAnnual ? "translate-x-[97%]" : "translate-x-0"
                  }`}
                />
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

      {/* Footer Público */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tighter text-slate-500 uppercase italic">
              Genni<span className="text-primary italic">Asistent</span>
            </span>
            <span className="text-slate-400 text-sm">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
