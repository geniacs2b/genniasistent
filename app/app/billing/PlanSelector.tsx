"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { PLANS, PLAN_ORDER, type PlanKey } from "@/lib/planConfig";
import { ArrowRight, CheckCircle2, Loader2, TrendingDown } from "lucide-react";

interface PlanSelectorProps {
  currentPlanKey: PlanKey | null;
  wompiActive: boolean;
}

export function PlanSelector({ currentPlanKey, wompiActive }: PlanSelectorProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  // null = no paid plan (trial) → currentIdx = -1 → all plans are upgrades
  const currentIdx = currentPlanKey ? PLAN_ORDER.indexOf(currentPlanKey) : -1;

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    setCheckoutError(null);

    // Guardia: nunca llamar al endpoint sin planKey válido
    if (!planKey || !PLAN_ORDER.includes(planKey)) {
      setCheckoutError(`Plan inválido: "${planKey}"`);
      console.error("[PlanSelector] planKey inválido antes de fetch:", planKey);
      return;
    }

    console.log("[PlanSelector] Iniciando checkout →", { planKey, isAnnual });
    setLoadingPlan(planKey);

    try {
      const payload = { planKey, isAnnual };
      console.log("[PlanSelector] Body enviado al endpoint:", JSON.stringify(payload));

      const res = await fetch("/api/wompi/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("[PlanSelector] Respuesta del endpoint:", { status: res.status, data });

      if (!res.ok || !data.url) {
        throw new Error(data.error || `Error ${res.status} — sin URL de checkout`);
      }

      window.location.href = data.url;
    } catch (err: any) {
      const msg = err.message ?? "Error desconocido";
      console.error("[PlanSelector] Checkout falló:", msg);
      setCheckoutError(msg);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toggle mensual / anual — idéntico al de /precios */}
      <div className="flex items-center justify-center">
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
              -20%
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

      {/* Cards — mismo grid de /precios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => {
          const planIdx = PLAN_ORDER.indexOf(plan.key);
          const isCurrent  = currentPlanKey !== null && plan.key === currentPlanKey;
          const isUpgrade  = planIdx > currentIdx;
          const isDowngrade = planIdx < currentIdx;
          const isLoading  = loadingPlan === plan.key;

          let action: React.ReactNode;

          if (isCurrent) {
            // ── Plan activo ──────────────────────────────────────
            action = (
              <Button
                disabled
                className={`w-full rounded-xl h-14 font-bold cursor-default ${
                  plan.dark
                    ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/10"
                    : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary/5"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Plan Actual
              </Button>
            );
          } else if (isUpgrade) {
            if (!wompiActive) {
              // ── Upgrade disponible pero pagos no activos ────────
              action = (
                <Button
                  disabled
                  variant="outline"
                  className={`w-full rounded-xl h-14 font-bold ${
                    plan.dark
                      ? "border-slate-600 text-slate-400 bg-slate-800/50"
                      : "border-slate-200 text-slate-400 bg-slate-50"
                  }`}
                >
                  Próximamente
                </Button>
              );
            } else {
              // ── Upgrade activo ──────────────────────────────────
              action = (
                <Button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={isLoading}
                  className={`w-full rounded-xl h-14 font-bold gap-2 transition-all hover:-translate-y-0.5 ${
                    plan.dark
                      ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                      : "bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                  }`}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                  ) : (
                    <>
                      Cambiar a este plan
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              );
            }
          } else {
            // ── Downgrade ────────────────────────────────────────
            action = (
              <Button
                disabled
                variant="outline"
                className="w-full rounded-xl h-14 font-bold border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
              >
                <TrendingDown className="w-4 h-4 mr-2 opacity-50" />
                Plan inferior
              </Button>
            );
          }

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

      {!wompiActive && (
        <p className="text-center text-xs text-slate-400 font-medium pt-2">
          Los pagos se activarán próximamente. Mientras tanto, disfruta tu cuota gratuita.
        </p>
      )}

      {checkoutError && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium px-4 py-3 rounded-xl">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>{checkoutError}</span>
          <button
            onClick={() => setCheckoutError(null)}
            className="ml-auto shrink-0 text-rose-400 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
