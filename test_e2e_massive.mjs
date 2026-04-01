import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// 1. Cargamos las variables de entorno desde .env.local (Next.js estándar)
dotenv.config({ path: '.env.local' });

// 2. Extracción de variables requeridas
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

// 3. Validación estricta y controlada de entorno
if (!supabaseUrl || !supabaseKey) {
   console.error("❌ ERROR CRÍTICO: Variables de entorno de Supabase faltantes.");
   console.error("Asegúrate de tener un archivo .env.local en la raíz del proyecto con:");
   console.error("  SUPABASE_URL=tu_url_aqui");
   console.error("  SUPABASE_SERVICE_ROLE_KEY=tu_token_aqui");
   process.exit(1);
}

// 4. Inicialización segura del cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
   auth: { autoRefreshToken: false, persistSession: false },
});

const NUM_PERSONAS = 50;

async function runE2ETest() {
   console.log(`🚀 Iniciando Prueba E2E Automática con Esquema Real...`);

   // ============================================
   // FASE 0: AUTO-DESCUBRIMIENTO DE DATOS
   // ============================================
   console.log(`\n🔍 Buscando Tenant y Evento válidos en la base de datos...`);

   // A. Obtener un Tenant válido
   let { data: tenants, error: tenantErr } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(1);

   if (tenantErr || !tenants || tenants.length === 0) {
      console.error("❌ ERROR: No se encontró ninguna Empresa (Tenant) visible.");
      if (tenantErr) console.error(tenantErr);
      process.exit(1);
   }

   const testTenant = tenants[0];
   console.log(`✅  Tenant descubierto: "${testTenant.name}" (ID: ${testTenant.id})`);

   // B. Obtener un Evento asociado a este Tenant
   let { data: eventos, error: eventoErr } = await supabase
      .from('eventos')
      .select('id, titulo')
      .eq('tenant_id', testTenant.id)
      .limit(1);

   // Fallback global si no hay eventos en ese tenant
   if (!eventos || eventos.length === 0) {
      console.log(`⚠️ No hay eventos en ${testTenant.name}. Buscando cualquier evento global...`);
      const fallback = await supabase.from('eventos').select('id, titulo').limit(1);
      eventos = fallback.data;
   }

   if (!eventos || eventos.length === 0) {
      console.error(`❌ ERROR CRÍTICO: No hay eventos disponibles en la tabla 'eventos'.`);
      process.exit(1);
   }

   const testEvent = eventos[0];
   console.log(`✅  Evento seleccionado: "${testEvent.titulo}" (ID: ${testEvent.id})\n`);

   // ============================================
   // FASE 1: CREACIÓN DE PERSONAS (ESQUEMA REAL)
   // ============================================
   console.log(`1. Creando ${NUM_PERSONAS} registros en la tabla 'personas'...`);
   
   const timestamp = Date.now();
   const mockPersonas = Array.from({ length: NUM_PERSONAS }).map((_, i) => ({
      tenant_id: testTenant.id,
      tipo_documento: 'CC',
      numero_documento: `${timestamp}${i}`,
      nombres: `TestName ${i + 1}`,
      apellidos: `TestLastName ${i + 1}`,
      // NOTA: 'nombre_completo' NO se incluye porque es una columna GENERADA por la DB (nombres + apellidos)
      correo: `test_e2e_${timestamp}_${i + 1}@nomail.com`,
      tratamiento_datos_aceptado: true,
      fecha_aceptacion_tratamiento: new Date().toISOString()
   }));

   const { data: personasInsertadas, error: pError } = await supabase
      .from('personas')
      .insert(mockPersonas)
      .select('id');

   if (pError || !personasInsertadas) {
      console.error("❌ Error al insertar en 'personas':", pError);
      process.exit(1);
   }

   const personasIds = personasInsertadas.map(p => p.id);
   console.log(`✅  ${personasIds.length} personas creadas exitosamente.`);

   // ============================================
   // FASE 2: VINCULACIÓN A EVENTO (INSCRIPCIONES)
   // ============================================
   console.log(`2. Vinculando personas al evento en la tabla 'inscripciones'...`);
   
   const mockInscripciones = personasIds.map(personaId => ({
      persona_id: personaId, // Real: En 'inscripciones' es persona_id
      evento_id: testEvent.id,
      tenant_id: testTenant.id,
      estado: 'aprobado', // Valor válido
      fecha_inscripcion: new Date().toISOString(),
      fuente: 'test_e2e',
      tratamiento_datos_aceptado: true
   }));

   const { error: iError } = await supabase
      .from('inscripciones')
      .insert(mockInscripciones);

   if (iError) {
      console.error("❌ Error al insertar en 'inscripciones':", iError);
      process.exit(1);
   }

   console.log(`✅  ${mockInscripciones.length} inscripciones creadas.`);

   // ============================================
   // FASE 3: DISPACHO AL MOTOR DE BATCH
   // ============================================
   console.log(`3. Despachando lote al motor nativo (${baseUrl}/api/jobs/batch)...`);

   try {
      const res = await fetch(`${baseUrl}/api/jobs/batch`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            evento_id: testEvent.id,
            tenant_id: testTenant.id,
            participantes_ids: personasIds
         })
      });

      const apiJson = await res.json();
      if (!res.ok) {
         console.error("❌ Error en el API Route:", apiJson);
         process.exit(1);
      }

      console.log(`✅  Lote enviado a la cola con éxito!`);
      console.log(`📦 BATCH_ID:`, apiJson.batch_id);
      console.log(`\n======================================================`);
      console.log(`Monitorea el progreso en: ${baseUrl}/admin/monitoreo/${apiJson.batch_id}`);
      console.log(`======================================================\n`);

   } catch (err) {
      console.error("❌ Error de red al contactar el servidor local:", err.message);
   }
}

runE2ETest();
