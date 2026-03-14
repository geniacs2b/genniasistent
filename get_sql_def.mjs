import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function getFunctionDef() {
  console.log('--- Fetching Function Definition ---');
  
  // Intentamos obtener la definición de la función usando consultas al catálogo
  // Necesitamos el OID primero
  const { data: funcData, error: funcError } = await supabase.rpc('inspect_db', {
    query: `
      SELECT pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'registrar_inscripcion_evento';
    `
  }).catch(() => ({ data: null, error: 'RPC inspect_db no existe' }));

  if (funcData && funcData[0]) {
    console.log('DEFINICIÓN ENCONTRADA:');
    console.log(funcData[0].definition);
  } else {
    console.log('No se pudo obtener vía inspect_db. Intentando técnica de error de sintaxis...');
    // A veces, intentar crear una función con el mismo nombre pero argumentos diferentes da pistas, 
    // pero aquí intentaremos otro enfoque: listar argumentos de nuevo para estar SEGUROS.
  }
}

getFunctionDef();
