import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugData() {
  console.log('--- Debugging Personas Data ---');
  
  const { data, error } = await supabase
    .from('personas')
    .select('id, nombre_completo, numero_documento, nombres, apellidos')
    .limit(10);
    
  if (error) {
    console.error('Error fetching personas:', error.message);
  } else {
    console.table(data);
  }
}

debugData();
