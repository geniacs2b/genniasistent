/**
 * planConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Fuente de verdad única para todos los planes del producto.
 * Usada tanto en /precios (landing) como en /app/billing (panel).
 * ─────────────────────────────────────────────────────────────────
 */

export type PlanKey = "starter" | "pro" | "enterprise";

export const PLAN_ORDER: PlanKey[] = ["starter", "pro", "enterprise"];

/** Cuota de certificados para cuentas en período de prueba */
export const TRIAL_QUOTA = 5;

export type PlanFeature = {
  text: string;
  highlight?: boolean;  // texto en negrita (el item principal del plan)
  included: boolean;    // true = CheckCircle, false = XCircle (exclusión)
};

export type PlanConfig = {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthly: number | null;  // null = precio custom (Enterprise)
  priceAnnual: number | null;
  priceDisplay?: string;        // override del precio mostrado (ej. "199+")
  annualBillingText?: string;   // ej. "Facturado $228 anualmente"
  quotaThreshold: number;       // para detectar plan activo desde certificate_quota
  dark: boolean;                // Pro usa fondo oscuro
  topBadge?: string;            // badge flotante sobre la card
  footerMessage?: string;       // mensaje de conversión al pie de la card
  features: PlanFeature[];
};

export const PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    description: "Ideal para comenzar y validar tus eventos.",
    priceMonthly: 149000,
    priceAnnual: 119200,
    annualBillingText: "Facturado $1.430.400 anualmente",
    quotaThreshold: 500,
    dark: false,
    features: [
      { text: "Hasta 500 certificados / mes",          highlight: true,  included: true  },
      { text: "Envío automático por correo",           highlight: false, included: true  },
      { text: "Eventos ilimitados",                    highlight: false, included: true  },
      { text: "1 usuario",                             highlight: false, included: true  },
    ],
  },
  {
    key: "pro",
    name: "Pro SaaS",
    description: "Plan de alto rendimiento para academias y empresas.",
    priceMonthly: 499000,
    priceAnnual: 399200,
    annualBillingText: "Facturado $4.790.400 anualmente",
    quotaThreshold: 3500,
    dark: true,
    topBadge: "RECOMENDADO",
    footerMessage: "Desde el certificado 1.700 ya estás ahorrando dinero frente a Starter",
    features: [
      { text: "Hasta 3.500 certificados / mes",                 highlight: true,  included: true },
      { text: "7 veces más capacidad que Starter",              highlight: true,  included: true },
      { text: "Certificado a $142 vs $298 en Starter",          highlight: false, included: true },
      { text: "Reduce tu costo en más del 50%",                 highlight: false, included: true },
      { text: "Envío con dominio personalizado (SMTP)",         highlight: false, included: true },
      { text: "Gestión de equipo (multiusuario)",               highlight: false, included: true },
      { text: "Mayor velocidad de envío",                       highlight: false, included: true },
      { text: "Soporte preferencial",                           highlight: false, included: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Diseñado para organizaciones con alto volumen de certificados.",
    priceMonthly: 1200000,
    priceAnnual: null,
    priceDisplay: "Desde $1.2M",
    quotaThreshold: 100_000,
    dark: false,
    features: [
      { text: "Certificados ilimitados",             highlight: true,  included: true },
      { text: "Infraestructura dedicada",            highlight: false, included: true },
      { text: "SLA garantizado 99.9%",               highlight: false, included: true },
      { text: "Account Manager",                     highlight: false, included: true },
      { text: "Integraciones personalizadas",        highlight: false, included: true },
    ],
  },
];

/**
 * Deriva el PlanKey activo a partir de certificate_quota del tenant.
 */
export function getPlanKeyFromQuota(quota: number): PlanKey {
  if (quota >= 100_000) return "enterprise";
  if (quota > 500)      return "pro";
  return "starter";
}
