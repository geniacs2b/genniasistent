import { createClient } from "@/lib/supabaseServer";
import { Button } from "@/components/ui/button";
import {
  CreditCard, CheckCircle2, FileText, ArrowUpRight,
  Zap, ShieldCheck, LayoutGrid,
} from "lucide-react";
import dayjs from "dayjs";
import PortalButton from "./PortalButton";
import { PlanSelector } from "./PlanSelector";
import { PaymentResultBanner } from "./PaymentResultBanner";
import { getPlanKeyFromQuota, type PlanKey, TRIAL_QUOTA } from "@/lib/planConfig";
import { WompiService } from "@/lib/wompi";

export const dynamic = "force-dynamic";

// Wompi activo si todas las variables de entorno están definidas
const WOMPI_ACTIVE = WompiService.isConfigured();

type WompiStatus = "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING" | null;

/** Wompi redirige de vuelta con ?wompi=1&ref=...&status=APPROVED&id=... */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: { wompi?: string; status?: string; ref?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id;

  const { data: tenantInfo } = await supabase
    .from("tenants")
    .select("certificate_quota, total_consumed, created_at, current_plan_key, billing_status")
    .eq("id", tenantId || "")
    .single();

  if (!tenantId || !tenantInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        No se detectó el entorno de facturación.
      </div>
    );
  }

  // Resultado del pago (Wompi redirige de vuelta con ?wompi=1&status=APPROVED&ref=...)
  const wompiReturn  = searchParams.wompi === "1";
  const wompiStatus  = (wompiReturn ? (searchParams.status?.toUpperCase() ?? "PENDING") : null) as WompiStatus;
  const wompiRef     = searchParams.ref ?? null;

  const isUnlimited = tenantInfo.certificate_quota >= 100_000;
  const billingStatus  = tenantInfo.billing_status as string ?? "trial";
  const isActivePlan   = billingStatus === "active";
  // currentPlanKey is null when on trial (no paid plan)
  const currentPlanKey = isActivePlan
    ? (tenantInfo.current_plan_key as PlanKey | null ?? getPlanKeyFromQuota(tenantInfo.certificate_quota))
    : null;

  const planLabels: Record<string, string> = {
    starter:    "Starter",
    pro:        "Pro SaaS",
    enterprise: "Enterprise",
  };
  const priceLabels: Record<string, string> = {
    starter:    "$149.000",
    pro:        "$499.000",
    enterprise: "$1.2M+",
  };

  const porcentajeConsumido = isUnlimited
    ? 0
    : Math.min(100, Math.round(
        ((tenantInfo.total_consumed || 0) / (tenantInfo.certificate_quota || 1)) * 100
      ));

  const barColor =
    porcentajeConsumido >= 90 ? "from-rose-500 to-red-600"
    : porcentajeConsumido >= 70 ? "from-amber-400 to-orange-500"
    : "from-emerald-500 to-primary";

  const invoices = [
    {
      id: "INV-001",
      date: tenantInfo.created_at || new Date().toISOString(),
      amount: "0.00",
      status: "paid",
      description: isActivePlan ? "Plan activado" : "Registro — Período de prueba gratuito",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary" />
          Suscripción y Créditos
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
          Gestiona tu plan actual, revisa el consumo de tu cuota y actualiza tu suscripción.
        </p>
      </div>

      {/* ── Banner de resultado del pago (aparece al volver de Wompi) ── */}
      {wompiReturn && (
        <PaymentResultBanner status={wompiStatus} reference={wompiRef} />
      )}

      {/* ── Resumen plan activo ──────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 -m-16 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:bg-primary/30 transition-colors pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            {isActivePlan ? (
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-4 shadow-sm uppercase tracking-wider">
                Plan Activo
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 mb-4 shadow-sm uppercase tracking-wider">
                Período de Prueba
              </span>
            )}
            <h2 className="text-4xl font-black text-white">
              {isActivePlan && currentPlanKey ? planLabels[currentPlanKey] : "Prueba gratuita"}
            </h2>
            <p className="text-slate-400 mt-2 text-sm font-medium">
              {isActivePlan && currentPlanKey
                ? `Facturación mensual renovable · ${priceLabels[currentPlanKey]}/mes`
                : `Incluye ${TRIAL_QUOTA} certificados · Actualiza para ampliar tu cuota`}
            </p>
          </div>

          {/* Métricas de cuota */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:min-w-[420px]">
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">Cuota del Mes</p>
              <p className="text-2xl font-bold text-white flex items-center gap-2">
                {isUnlimited ? "∞" : tenantInfo.certificate_quota.toLocaleString()}
                <Zap className="w-4 h-4 text-amber-400" />
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">Consumidos</p>
              <p className="text-2xl font-bold text-white">
                {tenantInfo.total_consumed.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="flex justify-between items-end mb-2">
                <p className="text-sm text-slate-500 font-medium">Uso del Plan</p>
                <span className={`text-xs font-bold ${
                  porcentajeConsumido >= 90 ? "text-rose-400"
                  : porcentajeConsumido >= 70 ? "text-amber-400"
                  : "text-emerald-400"
                }`}>
                  {isUnlimited ? "Sin límite" : `${porcentajeConsumido}%`}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${barColor} h-2 rounded-full transition-all duration-700`}
                  style={{ width: isUnlimited ? "100%" : `${porcentajeConsumido}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Selector de plan ─────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Cambiar de Plan
          </h2>
        </div>

        {/* Client component: toggle + 3 cards con lógica de estado */}
        <PlanSelector currentPlanKey={currentPlanKey} wompiActive={WOMPI_ACTIVE} />
      </div>

      {/* ── Historial de facturas + Portal de pago ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Invoices */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Historial de Facturas
            </h3>
            <Button variant="ghost" className="text-slate-500 text-sm font-semibold h-9 px-3">
              Descargar Todas
            </Button>
          </div>

          <div className="space-y-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex h-10 w-10 bg-emerald-100 rounded-full items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      {inv.description}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1 font-medium">
                      <span>{dayjs(inv.date).format("DD MMM YYYY")}</span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono">{inv.id}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    ${inv.amount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg font-bold border-slate-200 hover:bg-slate-100"
                  >
                    PDF <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Portal de pago seguro */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm self-start">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
            Portal de Facturación Segura
          </h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Actualiza tus métodos de pago, revisa históricos o cancela tu suscripción directamente desde nuestro gestor cifrado.
          </p>
          <PortalButton />
          <p className="text-[11px] text-center text-slate-400 mt-4 font-medium flex items-center justify-center gap-1">
            Pagos seguros procesados por{" "}
            <span className="font-bold text-slate-500">Wompi / Stripe</span>
          </p>
        </div>
      </div>
    </div>
  );
}
