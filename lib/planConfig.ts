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
  priceMonthly: number | null;      // null = precio custom (Enterprise)
  priceAnnual: number | null;       // Equivalente mensual para la UI (Total / 12)
  priceAnnualTotal: number | null;  // Monto total real a cobrar en checkout anual
  priceDisplay?: string;            // override del precio mostrado (ej. "199+")
  annualBillingText?: string;       // ej. "Facturado $228 anualmente"
  quotaThreshold: number;           // para detectar plan activo desde certificate_quota
  dark: boolean;                    // Pro usa fondo oscuro
  topBadge?: string;                // badge flotante sobre la card
  footerMessage?: string;           // mensaje de conversión al pie de la card
  features: PlanFeature[];
};

export const PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    description: "Ideal para comenzar con tus eventos.",
    priceMonthly: 149000,
    priceAnnual: 124167,
    priceAnnualTotal: 1490000, // 2 meses gratis ($149k * 10)
    annualBillingText: "Facturado $1.490.000 anualmente",
    quotaThreshold: 500,
    dark: false,
    features: [
      { text: "Hasta 500 certificados / mes",          highlight: true,  included: true  },
      { text: "Envío automático por correo",           highlight: false, included: true  },
      { text: "Gestión ilimitada de eventos",          highlight: false, included: true  },
      { text: "1 usuario",                             highlight: false, included: true  },
    ],
  },
  {
    key: "pro",
    name: "Pro SaaS",
    description: "Diseñado para escalar tus eventos sin limitaciones operativas.",
    priceMonthly: 499000,
    priceAnnual: 415833,
    priceAnnualTotal: 4990000, // 2 meses gratis ($499k * 10)
    annualBillingText: "Facturado $4.990.000 anualmente",
    quotaThreshold: 3500,
    dark: true,
    topBadge: "RECOMENDADO",
    footerMessage: "Si tu operación crece, este plan te permite escalar sin fricción",
    features: [
      { text: "Hasta 3.500 certificados / mes",                 highlight: true,  included: true },
      { text: "7 veces más capacidad que el plan Starter",      highlight: true,  included: true },
      { text: "Envío con dominio personalizado (SMTP)",         highlight: false, included: true },
      { text: "Gestión de equipo (multiusuario)",               highlight: false, included: true },
      { text: "Mayor velocidad de envío",                       highlight: false, included: true },
      { text: "Soporte preferencial",                           highlight: false, included: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    description: "Solución para organizaciones con alto volumen de certificados.",
    priceMonthly: 1200000,
    priceAnnual: null,
    priceAnnualTotal: null,
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

/**
 * Devuelve el plan actual del tenant (incluyendo 'trial' si no está activo).
 */
export function getTenantPlanKey(tenant: {
  billing_status?: string | null;
  current_plan_key?: string | null;
  certificate_quota?: number | null;
}): PlanKey | 'trial' {
  if (tenant.billing_status !== 'active') return 'trial';
  if (tenant.current_plan_key) return tenant.current_plan_key as PlanKey;
  return getPlanKeyFromQuota(tenant.certificate_quota ?? 0);
}

/**
 * Retorna true si el tenant tiene al menos el plan indicado.
 * 'trial' nunca cumple ningún requisito de plan.
 */
export function isPlanAtLeast(
  tenant: {
    billing_status?: string | null;
    current_plan_key?: string | null;
    certificate_quota?: number | null;
  },
  required: PlanKey,
): boolean {
  const current = getTenantPlanKey(tenant);
  if (current === 'trial') return false;
  return PLAN_ORDER.indexOf(current as PlanKey) >= PLAN_ORDER.indexOf(required);
}
