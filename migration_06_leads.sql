-- =================================================================
-- MIGRATION 06: Sistema de Captación de Leads
-- Tabla pública — no tiene tenant_id (leads son prospecto de la plataforma)
-- =================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text        NOT NULL,
  empresa     text,
  email       text        NOT NULL,
  whatsapp    text,
  plan        text        NOT NULL DEFAULT 'pro'
                          CHECK (plan IN ('starter', 'pro', 'enterprise')),
  mensaje     text,
  estado      text        NOT NULL DEFAULT 'nuevo'
                          CHECK (estado IN ('nuevo', 'contactado', 'cerrado')),
  fuente      text        DEFAULT 'precios',   -- 'precios' | 'billing' | 'landing'
  created_at  timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_estado     ON public.leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_plan       ON public.leads(plan);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON public.leads(email);

-- ─────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Formulario público: cualquier visitante puede enviar un lead
CREATE POLICY leads_insert_anon ON public.leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Usuarios autenticados también pueden enviar (desde /app/billing)
CREATE POLICY leads_insert_auth ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Equipo interno: cualquier usuario autenticado puede ver y gestionar leads
-- (se puede restringir por email de dominio en el futuro)
CREATE POLICY leads_select_auth ON public.leads
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY leads_update_auth ON public.leads
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
