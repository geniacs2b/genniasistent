-- 1. Activar el motor nativo para todos los tenants existentes
UPDATE public.tenants SET use_native_engine = true;

-- 2. Asegurar que futuros registros también hereden 'true' por defecto
ALTER TABLE public.tenants ALTER COLUMN use_native_engine SET DEFAULT true;

-- 3. Confirmación: Consultar estados después de cambio
SELECT id, name, use_native_engine FROM public.tenants;
