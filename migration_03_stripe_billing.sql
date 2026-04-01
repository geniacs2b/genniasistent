-- MIGRATION 03: Stripe Billing Integration for Tenants

-- Ampliación de la tabla de Tenants para soportar suscripciones B2B
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_current_period_end timestamp with time zone;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'onetime'));

-- Manejo separado de lo consumido global histórico (total_consumed) vs el límite que se agota (certificate_quota).
-- Si invoice.payment_succeeded: certificate_quota se actualiza (Ej: a 3500) según el metadata del Stripe Product.
-- Si customer.subscription.deleted o impago: certificate_quota se degada (Ej: a 100).
-- total_consumed solo se incrementa (+1) por cada trabajo existoso, NUNCA se borra.

-- Add RLS Políticas si no existen ya, para proteger tenants permitiendo Select y Update a los Owners.
