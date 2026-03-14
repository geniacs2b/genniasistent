import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFunction() {
  console.log('Inspeccionando funciones en el esquema public...');
  
  // Consultar información de la función desde el catálogo de Postgres
  const { data, error } = await supabase.rpc('inspect_functions_catalog', {}); // Si existe un helper
  // O mejor, una consulta directa si tenemos permisos de service role
  
  const { data: functions, error: funcError } = await supabase.rpc('inspect_db', {
    query: `
      SELECT 
        p.proname as function_name,
        pg_get_function_arguments(p.oid) as arguments
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'registrar_inscripcion_evento';
    `
  }).catch(() => ({ data: null, error: 'No se pudo ejecutar inspect_db' }));

  if (functions) {
    console.log('Función encontrada:', functions);
  } else {
    // Intento con una consulta simple para ver si al menos existe
    const { data: result, error: rawError } = await supabase.from('formularios').select('id').limit(1);
    console.log('Conexión básica ok:', !!result);
    console.log('Buscando definición de la función...');
  }
}

inspectFunction();
