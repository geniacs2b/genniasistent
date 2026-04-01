import crypto from 'crypto';
import type { PlanKey } from '@/lib/planConfig';

// ─────────────────────────────────────────────────────────────────
// Precios en COP (centavos de peso colombiano × 100)
// amount_in_cents = precio_COP × 100
// Ej: $95.000 COP → 9_500_000 centavos
// Configurables via variables de entorno; los defaults son referencia.
// ─────────────────────────────────────────────────────────────────
const COP = (priceCOP: number) => priceCOP * 100; // → centavos

function getPlanAmountCents(planKey: PlanKey, isAnnual: boolean): number {
  // Prioridad: variable de entorno → default hardcoded
  const env = (key: string, fallback: number) =>
    parseInt(process.env[key] ?? String(fallback), 10);

  switch (planKey) {
    case 'starter':
      return isAnnual
        ? env('WOMPI_AMOUNT_STARTER_ANNUAL_CENTS',  COP(912_000))    // ~$228 USD/año
        : env('WOMPI_AMOUNT_STARTER_MONTHLY_CENTS', COP(95_000));    // ~$25 USD/mes
    case 'pro':
      return isAnnual
        ? env('WOMPI_AMOUNT_PRO_ANNUAL_CENTS',      COP(3_348_000))  // ~$828 USD/año
        : env('WOMPI_AMOUNT_PRO_MONTHLY_CENTS',     COP(355_000));   // ~$89 USD/mes
    case 'enterprise':
      return isAnnual
        ? env('WOMPI_AMOUNT_ENTERPRISE_ANNUAL_CENTS',  COP(9_480_000))  // ~$199/mes × 12 × 0.8 descuento
        : env('WOMPI_AMOUNT_ENTERPRISE_MONTHLY_CENTS', COP(790_000));   // ~$199 USD/mes
    default:
      throw new Error(`[Wompi] Plan desconocido: ${planKey}`);
  }
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
