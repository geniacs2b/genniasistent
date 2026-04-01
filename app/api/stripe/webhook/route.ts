import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Usamos el cliente anon de supabase pero con SECRET KEY para by-pass de RLS, 
// ya que el webhook corre en background sin sesion de usuario activa.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// No lanzamos error aquí para no romper el build/runtime general
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const isStripeConfigured = !!stripeSecretKey && !stripeSecretKey.includes('_REQUIRED');

const stripe = isStripeConfigured 
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    if (!stripe || !isStripeConfigured) {
      console.warn('Stripe Webhook recibido pero Stripe no está configurado (Safe Mode).');
      return NextResponse.json({ received: true, note: 'Safe Mode Active' });
    }

    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Falta validación de webhook (Signature or Secret)' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error de Firma: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Procesando eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenant_id || (session.subscription ? await getTenantBySubscription(session.subscription as string) : null);
        
        if (tenantId && session.subscription) {
           // Suscripción Creada Exitosamente, actualizar campos base.
           await supabaseAdmin.from('tenants').update({
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string
           }).eq('id', tenantId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string' 
             ? invoice.subscription 
             : invoice.subscription?.id;
        
        if (!subscriptionId) {
             // Es un pago one-time (Ej: Comprar 500 certificados extra puntuales)
             // Aquí leemos de metadata del line item si lo pasamos desde el Checkout mode: payment
             break;
        }

        const tenantId = await getTenantBySubscription(subscriptionId);
        
        if (tenantId) {
           // Obtenemos qué plan es mediante el precio (buscando en Stripe o del Invoice Line Item)
           const lineItem = invoice.lines.data[0] as any;
           const priceId = lineItem?.price?.id;
           
           // Vamos a buscar metadata del Producto ligado a ese Precio para saber cuánta cuota dar
           let extraQuota = 100; // Plan free por defecto
           if (priceId) {
               const price = await stripe.prices.retrieve(priceId as string, { expand: ['product'] });
               const product = price.product as Stripe.Product;
               if (product && product.metadata && product.metadata.quota) {
                   extraQuota = parseInt(product.metadata.quota, 10);
               }
           }
           
           const endPeriod = new Date((lineItem.period.end) * 1000);

           // Renovación de Mes! 
           // Asignamos la cuota completa del paquete temporalmente.
           await supabaseAdmin.from('tenants').update({
              certificate_quota: extraQuota,
              stripe_price_id: priceId,
              stripe_current_period_end: endPeriod.toISOString()
           }).eq('id', tenantId);
           
           console.log(`[Stripe Webhook] Cuota actualizada para tenant ${tenantId} a ${extraQuota} certificados.`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenant_id || await getTenantBySubscription(subscription.id);
        
        if (tenantId) {
           // El cliente canceló o impagó, retroceder al starter free
           await supabaseAdmin.from('tenants').update({
              stripe_subscription_id: null,
              stripe_price_id: null,
              certificate_quota: 100 // Regresando a Free Tier
           }).eq('id', tenantId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('Error procesando el Webhook:', err);
    return NextResponse.json({ error: 'Webhook Handler Failed' }, { status: 500 });
  }
}

// Helpers
async function getTenantBySubscription(subId: string): Promise<string | null> {
   if (!subId) return null;
   const { data } = await supabaseAdmin
       .from('tenants')
       .select('id')
       .eq('stripe_subscription_id', subId)
       .single();
   return data ? data.id : null;
}
