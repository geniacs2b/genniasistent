-- =================================================================
-- MIGRATION 04: Multi-Tenant Complete RLS & Isolation
-- Fecha: 2026-03-30
-- Propósito: Auditoría y corrección completa del modelo multi-tenant
--
-- DIAGNÓSTICO PREVIO:
-- ✓ Con tenant_id: eventos, personas, certificate_batches,
--                  certificate_jobs, email_deliveries, email_configurations
-- ✗ Sin tenant_id: formularios, formulario_campos, inscripciones,
--                  respuestas_formulario, sesiones_evento, qr_tokens_asistencia,
--                  asistencias, verificaciones_correo, plantillas_certificado,
--                  plantilla_campos_certificado, habilitaciones_certificado,
--                  configuracion_correo_sistema, plantillas_correo, envios_correo
-- ✗ RLS: NO habilitado en ninguna tabla
-- ✗ Policies: NINGUNA creada aún
-- ✓ Globales (sin tenant_id, correcto): tenants, tenant_users
-- =================================================================

-- =================================================================
-- FASE 1: AGREGAR tenant_id A TABLAS FALTANTES
-- (Nullable inicialmente para no romper datos existentes)
-- =================================================================

-- 1. formularios → deriva de eventos.tenant_id
ALTER TABLE public.formularios
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. formulario_campos → deriva de formularios.tenant_id
ALTER TABLE public.formulario_campos
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 3. inscripciones → deriva de eventos.tenant_id
ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. respuestas_formulario → deriva de inscripciones.tenant_id
ALTER TABLE public.respuestas_formulario
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 5. sesiones_evento → deriva de eventos.tenant_id
ALTER TABLE public.sesiones_evento
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 6. qr_tokens_asistencia → deriva de sesiones_evento.tenant_id
ALTER TABLE public.qr_tokens_asistencia
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 7. asistencias → deriva de eventos.tenant_id
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 8. verificaciones_correo → deriva de inscripciones.tenant_id
ALTER TABLE public.verificaciones_correo
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 9. plantillas_certificado → propiedad directa del tenant
ALTER TABLE public.plantillas_certificado
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 10. plantilla_campos_certificado → deriva de plantillas_certificado.tenant_id
ALTER TABLE public.plantilla_campos_certificado
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 11. habilitaciones_certificado → deriva de eventos.tenant_id
ALTER TABLE public.habilitaciones_certificado
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 12. configuracion_correo_sistema → config institucional por tenant
ALTER TABLE public.configuracion_correo_sistema
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 13. plantillas_correo → plantillas de correo por tenant
ALTER TABLE public.plantillas_correo
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 14. envios_correo → registros de envío por tenant
ALTER TABLE public.envios_correo
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- =================================================================
-- FASE 2: POBLAR tenant_id EN REGISTROS EXISTENTES
-- Propagación desde tablas padre hacia hijos
-- =================================================================

-- 2.1 formularios ← eventos
UPDATE public.formularios f
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE f.evento_id = e.id
  AND f.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- 2.2 formulario_campos ← formularios
UPDATE public.formulario_campos fc
SET tenant_id = f.tenant_id
FROM public.formularios f
WHERE fc.formulario_id = f.id
  AND fc.tenant_id IS NULL
  AND f.tenant_id IS NOT NULL;

-- 2.3 inscripciones ← eventos
UPDATE public.inscripciones i
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE i.evento_id = e.id
  AND i.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- 2.4 respuestas_formulario ← inscripciones
UPDATE public.respuestas_formulario rf
SET tenant_id = i.tenant_id
FROM public.inscripciones i
WHERE rf.inscripcion_id = i.id
  AND rf.tenant_id IS NULL
  AND i.tenant_id IS NOT NULL;

-- 2.5 sesiones_evento ← eventos
UPDATE public.sesiones_evento s
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE s.evento_id = e.id
  AND s.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- 2.6 qr_tokens_asistencia ← sesiones_evento
--     (la tabla usa sesion_evento_id o sesion_id según versión del schema)
UPDATE public.qr_tokens_asistencia q
SET tenant_id = s.tenant_id
FROM public.sesiones_evento s
WHERE (q.sesion_evento_id = s.id OR q.sesion_id = s.id)
  AND q.tenant_id IS NULL
  AND s.tenant_id IS NOT NULL;

-- 2.7 asistencias ← eventos
UPDATE public.asistencias a
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE a.evento_id = e.id
  AND a.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- 2.8 verificaciones_correo ← inscripciones
UPDATE public.verificaciones_correo v
SET tenant_id = i.tenant_id
FROM public.inscripciones i
WHERE v.inscripcion_id = i.id
  AND v.tenant_id IS NULL
  AND i.tenant_id IS NOT NULL;

-- 2.9 plantilla_campos_certificado ← plantillas_certificado
UPDATE public.plantilla_campos_certificado pcc
SET tenant_id = pc.tenant_id
FROM public.plantillas_certificado pc
WHERE pcc.plantilla_certificado_id = pc.id
  AND pcc.tenant_id IS NULL
  AND pc.tenant_id IS NOT NULL;

-- 2.10 habilitaciones_certificado ← eventos
UPDATE public.habilitaciones_certificado h
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE h.evento_id = e.id
  AND h.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- 2.11 envios_correo ← eventos
UPDATE public.envios_correo ec
SET tenant_id = e.tenant_id
FROM public.eventos e
WHERE ec.evento_id = e.id
  AND ec.tenant_id IS NULL
  AND e.tenant_id IS NOT NULL;

-- =================================================================
-- FASE 3: CORREGIR CONSTRAINT ÚNICA DE PERSONAS
-- (Antes: global por documento → Ahora: por documento + tenant)
-- =================================================================

-- Eliminar constraint global
ALTER TABLE public.personas
  DROP CONSTRAINT IF EXISTS personas_documento_unique;

-- Crear constraint tenant-scoped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personas_documento_tenant_unique'
  ) THEN
    ALTER TABLE public.personas
      ADD CONSTRAINT personas_documento_tenant_unique
      UNIQUE (tipo_documento, numero_documento, tenant_id);
  END IF;
END $$;

-- =================================================================
-- FASE 4: ÍNDICES POR tenant_id (performance de aislamiento)
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_eventos_tenant              ON public.eventos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_personas_tenant             ON public.personas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_formularios_tenant          ON public.formularios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_formulario_campos_tenant    ON public.formulario_campos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_tenant        ON public.inscripciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_tenant ON public.respuestas_formulario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_evento_tenant      ON public.sesiones_evento(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_tenant            ON public.qr_tokens_asistencia(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_tenant          ON public.asistencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verificaciones_correo_tenant ON public.verificaciones_correo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_cert_tenant      ON public.plantillas_certificado(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plantilla_campos_cert_tenant ON public.plantilla_campos_certificado(tenant_id);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_cert_tenant  ON public.habilitaciones_certificado(tenant_id);
CREATE INDEX IF NOT EXISTS idx_config_correo_tenant        ON public.configuracion_correo_sistema(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_correo_tenant    ON public.plantillas_correo(tenant_id);
CREATE INDEX IF NOT EXISTS idx_envios_correo_tenant        ON public.envios_correo(tenant_id);

-- =================================================================
-- FASE 5: FUNCIÓN HELPER PARA TENANT ACTUAL
-- Lee tenant_id desde el JWT app_metadata del usuario autenticado
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF((auth.jwt() -> 'app_metadata' ->> 'tenant_id'), '')::uuid;
$$;

-- =================================================================
-- FASE 6: HABILITAR RLS + CREAR POLICIES
--
-- ESTRATEGIA DE ACCESO:
-- • authenticated: solo ve datos de su tenant (vía JWT app_metadata)
-- • anon: acceso mínimo para formularios públicos y QR (solo SELECT)
--         Las escrituras anónimas van exclusivamente por RPCs SECURITY DEFINER
-- • service_role: bypasea RLS por defecto (correcto para workers/n8n)
-- =================================================================

-- ─────────────────────────────────────────────────────────────────
-- 6.1  TENANTS  (cada usuario ve solo su organización)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_own    ON public.tenants;
DROP POLICY IF EXISTS tenants_update_own   ON public.tenants;

CREATE POLICY tenants_select_own ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_current_tenant_id());

CREATE POLICY tenants_update_own ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_current_tenant_id())
  WITH CHECK (id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.2  TENANT_USERS  (cada usuario ve solo sus membresías)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_users_select  ON public.tenant_users;

CREATE POLICY tenant_users_select ON public.tenant_users
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.3  EVENTOS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_tenant_all    ON public.eventos;
DROP POLICY IF EXISTS eventos_anon_select   ON public.eventos;

CREATE POLICY eventos_tenant_all ON public.eventos
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Formularios de inscripción públicos necesitan leer datos del evento
CREATE POLICY eventos_anon_select ON public.eventos
  FOR SELECT TO anon
  USING (activo = true);

-- ─────────────────────────────────────────────────────────────────
-- 6.4  FORMULARIOS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS formularios_tenant_all   ON public.formularios;
DROP POLICY IF EXISTS formularios_anon_select  ON public.formularios;

CREATE POLICY formularios_tenant_all ON public.formularios
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Necesario para que /inscripcion/[slug] funcione sin login
CREATE POLICY formularios_anon_select ON public.formularios
  FOR SELECT TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────────
-- 6.5  FORMULARIO_CAMPOS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.formulario_campos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS formulario_campos_tenant_all   ON public.formulario_campos;
DROP POLICY IF EXISTS formulario_campos_anon_select  ON public.formulario_campos;

CREATE POLICY formulario_campos_tenant_all ON public.formulario_campos
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY formulario_campos_anon_select ON public.formulario_campos
  FOR SELECT TO anon
  USING (activo = true);

-- ─────────────────────────────────────────────────────────────────
-- 6.6  PERSONAS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personas_tenant_all ON public.personas;

CREATE POLICY personas_tenant_all ON public.personas
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Nota: Las escrituras desde el formulario público van por RPC SECURITY DEFINER.
--       No se expone acceso directo INSERT/UPDATE a anon.

-- ─────────────────────────────────────────────────────────────────
-- 6.7  INSCRIPCIONES
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inscripciones_tenant_all ON public.inscripciones;

CREATE POLICY inscripciones_tenant_all ON public.inscripciones
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.8  RESPUESTAS_FORMULARIO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.respuestas_formulario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS respuestas_formulario_tenant_all ON public.respuestas_formulario;

CREATE POLICY respuestas_formulario_tenant_all ON public.respuestas_formulario
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.9  VERIFICACIONES_CORREO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.verificaciones_correo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verificaciones_correo_tenant_all ON public.verificaciones_correo;

CREATE POLICY verificaciones_correo_tenant_all ON public.verificaciones_correo
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.10  SESIONES_EVENTO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.sesiones_evento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sesiones_evento_tenant_all   ON public.sesiones_evento;
DROP POLICY IF EXISTS sesiones_evento_anon_select  ON public.sesiones_evento;

CREATE POLICY sesiones_evento_tenant_all ON public.sesiones_evento
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- El RPC registrar_asistencia_por_qr (SECURITY DEFINER) lee sesiones_evento;
-- También validar_qr_asistencia. Con SECURITY DEFINER, RLS se bypasea. OK.

-- ─────────────────────────────────────────────────────────────────
-- 6.11  QR_TOKENS_ASISTENCIA
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.qr_tokens_asistencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_tokens_tenant_all    ON public.qr_tokens_asistencia;
DROP POLICY IF EXISTS qr_tokens_anon_active   ON public.qr_tokens_asistencia;

CREATE POLICY qr_tokens_tenant_all ON public.qr_tokens_asistencia
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- El escáner QR es una página pública (anon); los RPCs son SECURITY DEFINER.
-- Se permite SELECT anon solo en tokens activos para validación sin login.
CREATE POLICY qr_tokens_anon_active ON public.qr_tokens_asistencia
  FOR SELECT TO anon
  USING (activo = true AND estado = 'activo');

-- ─────────────────────────────────────────────────────────────────
-- 6.12  ASISTENCIAS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asistencias_tenant_all ON public.asistencias;

CREATE POLICY asistencias_tenant_all ON public.asistencias
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Escritura anon va exclusivamente por RPC SECURITY DEFINER (registrar_asistencia_por_qr)

-- ─────────────────────────────────────────────────────────────────
-- 6.13  PLANTILLAS_CERTIFICADO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.plantillas_certificado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantillas_cert_tenant_all ON public.plantillas_certificado;

CREATE POLICY plantillas_cert_tenant_all ON public.plantillas_certificado
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.14  PLANTILLA_CAMPOS_CERTIFICADO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.plantilla_campos_certificado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantilla_campos_cert_tenant_all ON public.plantilla_campos_certificado;

CREATE POLICY plantilla_campos_cert_tenant_all ON public.plantilla_campos_certificado
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.15  HABILITACIONES_CERTIFICADO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.habilitaciones_certificado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS habilitaciones_cert_tenant_all ON public.habilitaciones_certificado;

CREATE POLICY habilitaciones_cert_tenant_all ON public.habilitaciones_certificado
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.16  CERTIFICATE_BATCHES  (ya tenía tenant_id NOT NULL)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.certificate_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificate_batches_tenant_all ON public.certificate_batches;

CREATE POLICY certificate_batches_tenant_all ON public.certificate_batches
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.17  CERTIFICATE_JOBS  (ya tenía tenant_id NOT NULL)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.certificate_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificate_jobs_tenant_all ON public.certificate_jobs;

CREATE POLICY certificate_jobs_tenant_all ON public.certificate_jobs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.18  EMAIL_DELIVERIES  (ya tenía tenant_id NOT NULL)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_deliveries_tenant_all ON public.email_deliveries;

CREATE POLICY email_deliveries_tenant_all ON public.email_deliveries
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.19  EMAIL_CONFIGURATIONS  (ya tenía tenant_id NOT NULL UNIQUE)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.email_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_configurations_tenant_all ON public.email_configurations;

CREATE POLICY email_configurations_tenant_all ON public.email_configurations
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.20  CONFIGURACION_CORREO_SISTEMA
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.configuracion_correo_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS config_correo_sistema_tenant_all ON public.configuracion_correo_sistema;

CREATE POLICY config_correo_sistema_tenant_all ON public.configuracion_correo_sistema
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.21  PLANTILLAS_CORREO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.plantillas_correo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantillas_correo_tenant_all ON public.plantillas_correo;

CREATE POLICY plantillas_correo_tenant_all ON public.plantillas_correo
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ─────────────────────────────────────────────────────────────────
-- 6.22  ENVIOS_CORREO
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.envios_correo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS envios_correo_tenant_all ON public.envios_correo;

CREATE POLICY envios_correo_tenant_all ON public.envios_correo
  FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- =================================================================
-- FASE 7: ACTUALIZAR RPCs CRÍTICOS PARA PROPAGAR tenant_id
--
-- Los RPCs SECURITY DEFINER bypasean RLS, pero deben insertar con
-- tenant_id correcto. Se derivan de eventos usando p_evento_id.
-- =================================================================

-- 7.1 registrar_inscripcion_evento: debe insertar tenant_id en
--     personas, inscripciones, respuestas_formulario, verificaciones_correo
--     Añadir al inicio del bloque DECLARE:
--       v_tenant_id uuid;
--     Añadir al inicio del bloque BEGIN (luego de validar el formulario):
--       SELECT e.tenant_id INTO v_tenant_id FROM public.eventos e WHERE e.id = p_evento_id;

-- PARCHE MÍNIMO: asegurar tenant_id en inscripcion y derivadas durante el registro
-- (Aplica si el RPC original no lo incluye aún)

CREATE OR REPLACE FUNCTION public.get_tenant_id_by_evento(p_evento_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.eventos WHERE id = p_evento_id;
$$;

-- =================================================================
-- FASE 8: ACTUALIZAR RPC obtener_configuracion_correo_sistema_activa
-- Para que solo devuelva config del tenant actual (SECURITY DEFINER
-- no bypasea el contexto de usuario, solo RLS)
-- =================================================================

CREATE OR REPLACE FUNCTION public.obtener_configuracion_correo_sistema_activa()
RETURNS SETOF public.configuracion_correo_sistema
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.configuracion_correo_sistema
  WHERE activo = true
    AND tenant_id = public.get_current_tenant_id()
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- =================================================================
-- FASE 9: TABLA tipos_evento
-- Si existe: agregar tenant_id o dejarla global con protección lectura
--
-- DECISIÓN: tipos_evento puede ser:
--   A) Global compartida (todos los tenants ven los mismos tipos) → sin tenant_id
--   B) Por tenant (cada tenant crea sus propios tipos) → con tenant_id
--
-- Ejecutar solo la opción correspondiente al diseño real:
-- =================================================================

-- OPCIÓN A: tipos_evento GLOBAL (catálogo compartido, readonly para tenants)
-- ALTER TABLE public.tipos_evento ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tipos_evento_anon_select ON public.tipos_evento FOR SELECT TO anon USING (true);
-- CREATE POLICY tipos_evento_auth_select ON public.tipos_evento FOR SELECT TO authenticated USING (true);

-- OPCIÓN B: tipos_evento POR TENANT (descomentar si aplica)
-- ALTER TABLE public.tipos_evento ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS idx_tipos_evento_tenant ON public.tipos_evento(tenant_id);
-- ALTER TABLE public.tipos_evento ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tipos_evento_tenant_all ON public.tipos_evento FOR ALL TO authenticated
--   USING (tenant_id = public.get_current_tenant_id())
--   WITH CHECK (tenant_id = public.get_current_tenant_id());

-- =================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- Ejecutar estas queries para confirmar que todo quedó correcto:
-- =================================================================

-- Ver estado RLS de todas las tablas:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Ver policies creadas:
-- SELECT tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Ver tablas sin tenant_id (deberían ser solo tenants y tenant_users):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
--   AND table_name NOT IN (
--     SELECT table_name FROM information_schema.columns
--     WHERE table_schema = 'public' AND column_name = 'tenant_id'
--   )
-- ORDER BY table_name;

-- Filas sin tenant_id (no debería haber ninguna después de la migración):
-- SELECT 'formularios' as tabla, COUNT(*) FROM public.formularios WHERE tenant_id IS NULL
-- UNION ALL SELECT 'inscripciones', COUNT(*) FROM public.inscripciones WHERE tenant_id IS NULL
-- UNION ALL SELECT 'sesiones_evento', COUNT(*) FROM public.sesiones_evento WHERE tenant_id IS NULL
-- UNION ALL SELECT 'personas', COUNT(*) FROM public.personas WHERE tenant_id IS NULL;
