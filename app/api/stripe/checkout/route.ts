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
        error: 'El sistema de pagos está en mantenimiento o no ha sido configurado aún. Próximamente.' 
      }, { status: 503 });
    }

    const body = await req.json();
    const { planType } = body;

    const priceStarter = process.env.STRIPE_PRICE_STARTER;
    const pricePro = process.env.STRIPE_PRICE_PRO;
    const priceEnterprise = process.env.STRIPE_PRICE_ENTERPRISE;
    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!priceStarter || !pricePro || !priceEnterprise || !successUrl || !cancelUrl || 
        priceStarter.includes('_REQUIRED') || successUrl.includes('_REQUIRED')) {
      return NextResponse.json({ 
        error: 'Pasarela de pagos en modo preventivo. Contacta a soporte para planes Pro.' 
      }, { status: 503 });
    }

    let priceId = '';
    if (planType === 'starter') priceId = priceStarter;
    else if (planType === 'pro') priceId = pricePro;
    else if (planType === 'enterprise') priceId = priceEnterprise;
    else {
      return NextResponse.json({ error: 'Tipo de plan inválido' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
       return NextResponse.json({ error: 'El usuario no tiene una organización (tenant_id)' }, { status: 400 });
    }

    // 1. Obtener la data del Tenant
    const { data: tenant } = await supabase
       .from('tenants')
       .select('stripe_customer_id, name')
       .eq('id', tenantId)
       .single();

    if (!tenant) {
       return NextResponse.json({ error: 'Tenant no encontrado en la base de datos' }, { status: 404 });
    }

    let customerId = tenant.stripe_customer_id;

    // 2. Crear Cliente en Stripe si no existe
    if (!customerId) {
       const customer = await stripe.customers.create({
          email: user.email,
          name: tenant.name,
          metadata: {
             tenant_id: tenantId,
             supabase_uuid: user.id
          }
       });
       customerId = customer.id;

       // Guardamos el Customer ID creado
       await supabase.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId);
    }

    // 3. Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl.includes('{CHECKOUT_SESSION_ID}') ? successUrl : `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
         tenant_id: tenantId
      },
      subscription_data: {
         metadata: {
            tenant_id: tenantId // Pasamos al objeto de la suscripción para que los webhooks reaccionen rápido
         }
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Error in checkout session creation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
