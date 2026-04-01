import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WompiService } from '@/lib/wompi';
import { PLAN_ORDER, PLANS, type PlanKey } from '@/lib/planConfig';

export async function POST(req: NextRequest) {
  // ── PASO 0: Log de arranque + variables de entorno ─────────────
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL:     !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
    WOMPI_INTEGRITY_SECRET:       !!process.env.WOMPI_INTEGRITY_SECRET,
    WOMPI_EVENTS_SECRET:          !!process.env.WOMPI_EVENTS_SECRET,
    NEXT_PUBLIC_BASE_URL:         process.env.NEXT_PUBLIC_BASE_URL ?? '(no definida)',
  };
  console.log('[Checkout Wompi] ── INICIO ──────────────────────────');
  console.log('[Checkout Wompi] ENV check:', envCheck);

  try {
    // ── PASO 1: Verificar configuración de Wompi ─────────────────
    const isConfigured = WompiService.isConfigured();
    console.log('[Checkout Wompi] PASO 1 isConfigured:', isConfigured);

    if (!isConfigured) {
      const missing: string[] = [];
      if (!process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY) missing.push('NEXT_PUBLIC_WOMPI_PUBLIC_KEY');
      if (!process.env.WOMPI_INTEGRITY_SECRET)       missing.push('WOMPI_INTEGRITY_SECRET');
      if (!process.env.WOMPI_EVENTS_SECRET)          missing.push('WOMPI_EVENTS_SECRET');
      const msg = `Wompi no configurado. Variables faltantes: ${missing.join(', ')}`;
      console.error('[Checkout Wompi] PASO 1 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    // ── PASO 2: Autenticar usuario ───────────────────────────────
    console.log('[Checkout Wompi] PASO 2 Autenticando usuario...');
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => req.cookies.get(name)?.value } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[Checkout Wompi] PASO 2 user.id:', user?.id ?? null, '| authError:', authError?.message ?? null);

    if (authError || !user) {
      const msg = authError?.message ?? 'No se pudo obtener el usuario autenticado';
      console.error('[Checkout Wompi] PASO 2 FALLO:', msg);
      return NextResponse.json({ error: `Auth: ${msg}` }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    console.log('[Checkout Wompi] PASO 2 tenant_id desde JWT:', tenantId ?? '(null)');

    if (!tenantId) {
      const msg = `El usuario ${user.id} no tiene tenant_id en app_metadata`;
      console.error('[Checkout Wompi] PASO 2 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── PASO 3: Leer y validar body ──────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch (e: any) {
      const msg = `Body JSON inválido: ${e.message}`;
      console.error('[Checkout Wompi] PASO 3 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { planKey, isAnnual = false } = body as { planKey: PlanKey; isAnnual?: boolean };
    console.log('[Checkout Wompi] PASO 3 body recibido:', { planKey, isAnnual });

    if (!planKey) {
      const msg = 'planKey no fue enviado en el body';
      console.error('[Checkout Wompi] PASO 3 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!PLAN_ORDER.includes(planKey)) {
      const msg = `planKey inválido: "${planKey}". Valores aceptados: ${PLAN_ORDER.join(', ')}`;
      console.error('[Checkout Wompi] PASO 3 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // ── PASO 4: Calcular monto ───────────────────────────────────
    let amountInCents: number;
    let finalCurrency = 'COP';
    
    try {
      amountInCents = WompiService.getAmountCents(planKey, isAnnual);
    } catch (e: any) {
      const msg = `Error calculando monto: ${e.message}`;
      console.error('[Checkout Wompi] PASO 4 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    if (!amountInCents || amountInCents <= 0) {
      const msg = `Monto de checkout inválido para el plan ${planKey}: ${amountInCents}`;
      console.error('[Checkout Wompi] PASO 4 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const plan = PLAN_ORDER.includes(planKey) ? PLANS.find(p => p.key === planKey) : null;

    console.log('[Checkout Wompi] PASO 4 ─────────────────────────────');
    console.log(`[Checkout Wompi] Detalle del Cobro:
      - Plan:           ${planKey.toUpperCase()}
      - Ciclo:          ${isAnnual ? 'Anual' : 'Mensual'}
      - Precio Mensual: ${plan?.priceMonthly ?? 'N/A'}
      - Precio Anual:   ${plan?.priceAnnualTotal ?? 'N/A'}
      - Monto Final:    ${amountInCents} centavos (COP)
      - Referencia de Auditoría generándose...`);
    console.log('[Checkout Wompi] ──────────────────────────────────');

    const currency = finalCurrency;

    // ── PASO 5: Generar referencia ───────────────────────────────
    const shortId   = tenantId.replace(/-/g, '').slice(0, 8);
    const reference = `T${shortId}_${planKey}_${Date.now()}`;
    console.log('[Checkout Wompi] PASO 5 reference:', reference);

    // ── PASO 6: Insertar pago PENDING ───────────────────────────
    console.log('[Checkout Wompi] PASO 6 Insertando payment en DB...');
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return undefined; } } }
    );

    const { error: insertError } = await supabaseAdmin.from('payments').insert({
      tenant_id:       tenantId,
      plan_key:        planKey,
      is_annual:       isAnnual,
      reference,
      amount_in_cents: amountInCents,
      currency,
      status:          'PENDING',
    });

    if (insertError) {
      const msg = `DB insert payments falló: [${insertError.code}] ${insertError.message}${insertError.details ? ` | details: ${insertError.details}` : ''}${insertError.hint ? ` | hint: ${insertError.hint}` : ''}`;
      console.error('[Checkout Wompi] PASO 6 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    console.log('[Checkout Wompi] PASO 6 Payment insertado OK');

    // ── PASO 7: Generar firma + URL de Wompi ─────────────────────
    let checkoutUrl: string;
    try {
      const baseUrl     = WompiService.config.baseUrl;
      const redirectUrl = `${baseUrl}/app/billing?wompi=1&ref=${reference}`;
      console.log('[Checkout Wompi] PASO 7 redirectUrl:', redirectUrl);

      checkoutUrl = WompiService.buildCheckoutUrl({
        reference,
        amountInCents,
        currency,
        redirectUrl,
      });
    } catch (e: any) {
      const msg = `Error generando URL de Wompi: ${e.message}`;
      console.error('[Checkout Wompi] PASO 7 FALLO:', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log('[Checkout Wompi] PASO 7 checkoutUrl generada OK');
    console.log('[Checkout Wompi] ── ÉXITO | ref:', reference, '──────────────────');

    return NextResponse.json({ url: checkoutUrl });

  } catch (err: any) {
    const msg = err?.message ?? 'Error inesperado sin mensaje';
    console.error('[Checkout Wompi] ERROR NO CAPTURADO:', msg, err?.stack ?? '');
    return NextResponse.json({ error: `Error interno: ${msg}` }, { status: 500 });
  }
}
