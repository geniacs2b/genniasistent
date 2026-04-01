import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import Stripe from 'stripe';

// No lanzamos error aquí para no romper el build/runtime general
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isStripeConfigured = !!stripeSecretKey && !stripeSecretKey.includes('_REQUIRED');

const stripe = isStripeConfigured 
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any })
  : null;

export async function POST(req: Request) {
  try {
    if (!stripe || !isStripeConfigured) {
      return NextResponse.json({ 
        error: 'El portal de facturación se activará pronto. Por ahora, disfruta de tu plan Early Access.' 
      }, { status: 503 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
       return NextResponse.json({ error: 'Sin organización asignada' }, { status: 400 });
    }

    // Traer el Customer ID del Tenant
    const { data: tenant } = await supabase
       .from('tenants')
       .select('stripe_customer_id')
       .eq('id', tenantId)
       .single();

    if (!tenant || !tenant.stripe_customer_id) {
       return NextResponse.json({ error: 'No tienes un perfil de facturación activo. Compra un plan primero.' }, { status: 400 });
    }

    const returnUrl = process.env.STRIPE_CANCEL_URL || `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/app/billing`;

    // Generar la URL temporal del Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    console.error('Error generando Customer Portal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
