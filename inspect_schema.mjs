import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function inspectSchema() {
  const tables = ['eventos', 'asistencias', 'qr_tokens_asistencia', 'formularios', 'inscripciones', 'personas', 'formulario_campos', 'respuestas_formulario', 'verificaciones_correo'];
  
  console.log('--- Inspecting Table Columns ---');
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error(`Error inspecting ${table}:`, error.message);
    } else if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table is empty, trying to get columns via a dummy insert/rollback or other metadata if possible...');
      // If table is empty, we can't easily get keys from select *
      // Let's try to get a single row to see keys
    }
  }
}

inspectSchema();
