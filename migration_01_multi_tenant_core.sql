-- MIGRATION 01: Core Multi-Tenant Architecture

-- 1. Tabla de Empresas o Multi-Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  logo_url text,
  certificate_quota int DEFAULT 100, -- Límite temporal futuro
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Relación de Usuarios (Auth.users de Supabase) con Tenants y sus Roles
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, user_id) -- Un usuario pertenece una sola vez como empleado a un tenant
);

-- 3. Inyectar 'tenant_id' en todas las tablas transaccionales existentes 
-- (Se agrega de manera NULLABLE por seguridad de data anterior)

-- Asumiendo tablas previas (ajustemos en caso de que existan)
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.plantillas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.restricciones ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;


-- NOTA: RLS será habilitado tras poblar los IDs con el tenant padre.
