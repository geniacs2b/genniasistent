import crypto from 'crypto';
import { PLANS, type PlanKey } from '@/lib/planConfig';

// ─────────────────────────────────────────────────────────────────
// Precios en COP (centavos de peso colombiano × 100)
// amount_in_cents = precio_COP × 100
// Ej: $499.000 COP → 49_900_000 centavos
// ─────────────────────────────────────────────────────────────────
const COP = (priceCOP: number) => Math.round(priceCOP * 100); // → centavos

function getPlanAmountCents(planKey: PlanKey, isAnnual: boolean): number {
  // 1. Obtener la fuente de verdad única de planConfig
  const plan = PLANS.find(p => p.key === planKey);
  
  if (!plan) {
    throw new Error(`[Wompi] Plan desconocido en configuración: ${planKey}`);
  }

  // 2. Determinar precio base (COP)
  // Prioridad: variable de entorno (opcional) → valor en planConfig
  const envKey = `WOMPI_AMOUNT_${planKey.toUpperCase()}_${isAnnual ? 'ANNUAL' : 'MONTHLY'}_CENTS`;
  const envOverride = process.env[envKey];
  
  if (envOverride) {
    console.log(`[Wompi] Usando override de env para ${planKey}: ${envKey}`);
    return parseInt(envOverride, 10);
  }

  const basePrice = isAnnual ? plan.priceAnnual : plan.priceMonthly;

  if (basePrice === null || basePrice === undefined) {
    // Si no hay precio (ej: Enterprise custom), lanzamos error para evitar checkout accidental de $0
    throw new Error(`[Wompi] El plan ${planKey} (${isAnnual ? 'anual' : 'mensual'}) no tiene un precio definido para checkout automático.`);
  }

  const finalAmountCents = COP(basePrice);
  
  console.log(`[Wompi] Monto calculado para ${planKey}: $${basePrice} COP -> ${finalAmountCents} centavos`);
  
  return finalAmountCents;
}

// ─────────────────────────────────────────────────────────────────
// Wompi Service — utilidades centralizadas
// ─────────────────────────────────────────────────────────────────
export const WompiService = {
  get config() {
    return {
      publicKey:       process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? '',
      integritySecret: process.env.WOMPI_INTEGRITY_SECRET       ?? '',
      eventsSecret:    process.env.WOMPI_EVENTS_SECRET          ?? '',
      baseUrl:         process.env.NEXT_PUBLIC_BASE_URL         ?? 'http://localhost:3000',
      checkoutBaseUrl: 'https://checkout.wompi.co/p/',
    };
  },

  /** ¿Está Wompi completamente configurado para procesar pagos? */
  isConfigured(): boolean {
    const { publicKey, integritySecret, eventsSecret } = this.config;
    return (
      !!publicKey       && !publicKey.includes('_REQUIRED')       &&
      !!integritySecret && !integritySecret.includes('_REQUIRED') &&
      !!eventsSecret    && !eventsSecret.includes('_REQUIRED')
    );
  },

  /** Amount en centavos para un plan+ciclo dado */
  getAmountCents(planKey: PlanKey, isAnnual: boolean): number {
    return getPlanAmountCents(planKey, isAnnual);
  },

  /**
   * Genera la firma de integridad para el checkout widget.
   * Algoritmo oficial Wompi: SHA-256(reference + amountInCents + currency + integritySecret)
   */
  generateIntegritySignature(
    reference:    string,
    amountInCents: number,
    currency:     string = 'COP'
  ): string {
    const { integritySecret } = this.config;
    if (!integritySecret) throw new Error('[Wompi] WOMPI_INTEGRITY_SECRET no definido');
    const stringToSign = `${reference}${amountInCents}${currency}${integritySecret}`;
    return crypto.createHash('sha256').update(stringToSign).digest('hex');
  },

  /**
   * Construye la URL completa de redirección al checkout de Wompi.
   * El usuario es redirigido aquí para completar el pago.
   */
  buildCheckoutUrl(params: {
    reference:     string;
    amountInCents: number;
    currency?:     string;
    redirectUrl:   string;
  }): string {
    const { reference, amountInCents, redirectUrl } = params;
    const currency = params.currency ?? 'COP';
    const signature = this.generateIntegritySignature(reference, amountInCents, currency);
    const { publicKey, checkoutBaseUrl } = this.config;

    const query = new URLSearchParams({
      'public-key':          publicKey,
      'currency':            currency,
      'amount-in-cents':     String(amountInCents),
      'reference':           reference,
      'signature:integrity': signature,
      'redirect-url':        redirectUrl,
    });

    return `${checkoutBaseUrl}?${query.toString()}`;
  },

  /**
   * Valida la firma del evento recibido en el webhook.
   * Algoritmo oficial Wompi: SHA-256(tx.id + tx.status + tx.amount_in_cents + timestamp + eventsSecret)
   */
  validateEventSignature(body: any): boolean {
    try {
      const { eventsSecret } = this.config;
      if (!eventsSecret) {
        console.error('[Wompi] WOMPI_EVENTS_SECRET no definido — rechazando webhook');
        return false;
      }
      const tx               = body?.data?.transaction;
      const timestamp        = body?.timestamp;
      const expectedChecksum = body?.signature?.checksum;

      if (!tx || !timestamp || !expectedChecksum) {
        console.error('[Wompi] Webhook con estructura inválida');
        return false;
      }

      const stringToSign = `${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${eventsSecret}`;
      const hashHex      = crypto.createHash('sha256').update(stringToSign).digest('hex');
      return hashHex === expectedChecksum;
    } catch (err) {
      console.error('[Wompi] Error validando firma de evento:', err);
      return false;
    }
  },
};
