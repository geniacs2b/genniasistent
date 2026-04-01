"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { PlanConfig } from "@/lib/planConfig";

interface PlanCardProps {
  plan: PlanConfig;
  isAnnual: boolean;
  /** Slot de acción: el botón o CTA que va al fondo de la card */
  action: React.ReactNode;
}

/**
 * PlanCard — componente puro y reutilizable.
 * Usado en /precios (público) y /app/billing (panel).
 * CSS pixel-match con el diseño original de /precios.
 */
export function PlanCard({ plan, isAnnual, action }: PlanCardProps) {
  const { name, description, priceMonthly, priceAnnual, priceDisplay,
          annualBillingText, features, dark, topBadge, footerMessage } = plan;

  const rawPrice = priceDisplay
    ? priceDisplay
    : isAnnual
    ? priceAnnual
    : priceMonthly;

  const formattedPrice = typeof rawPrice === "number" 
    ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(rawPrice)
    : rawPrice;

  return (
    <div
      className={
        dark
          ? "bg-slate-900 rounded-[2rem] p-8 border-2 border-primary flex flex-col shadow-2xl shadow-primary/30 -translate-y-4 scale-105 z-10 transition-all duration-300 relative"
          : "bg-white rounded-[2rem] p-8 border border-slate-200 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
      }
    >
      {/* Badge flotante (solo Pro) */}
      {topBadge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 whitespace-nowrap z-20">
          {topBadge}
        </div>
      )}

      {/* Nombre + descripción */}
      <div className="mb-6">
        <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>
          {name}
        </h3>
        <p className={`text-sm mt-2 font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {description}
        </p>
      </div>

      {/* Precio */}
      <div className={`mb-8 border-b pb-8 ${dark ? "border-slate-700" : "border-slate-100"}`}>
        <span className={`text-4xl lg:text-5xl font-black tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
          {formattedPrice}
        </span>
        {!priceDisplay && (
          <span className={`font-bold ml-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>/mes</span>
        )}
        {isAnnual && annualBillingText && (
          <p className={`text-sm font-bold mt-2 ${dark ? "text-emerald-400" : "text-emerald-600"}`}>
            {annualBillingText}
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mb-10 space-y-4 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 text-sm lg:text-base font-medium ${
              dark ? "text-slate-300" : "text-slate-600"
            } ${!f.included ? "opacity-50" : ""}`}
          >
            {f.included ? (
              <CheckCircle2
                className={`w-5 h-5 shrink-0 text-primary ${dark ? "bg-primary/10 rounded-full" : ""}`}
              />
            ) : (
              <XCircle className="w-5 h-5 shrink-0" />
            )}
            <span className={f.highlight ? (dark ? "font-bold text-white uppercase text-[11px] tracking-wider" : "font-bold text-slate-900") : ""}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer Message (Conversion Copy) */}
      {footerMessage && (
        <div className={`mb-8 p-4 rounded-2xl text-center text-sm font-bold border ${
          dark 
            ? "bg-primary/10 border-primary/20 text-primary" 
            : "bg-slate-50 border-slate-100 text-slate-600"
        }`}>
          {footerMessage}
        </div>
      )}

      {/* Action slot */}
      <div className="mt-auto">
        {action}
      </div>
    </div>
  );
}
