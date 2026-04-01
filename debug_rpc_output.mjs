import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugRPC() {
  console.log('--- Debugging RPC obtner_estado_certificados_evento ---');
  
  const { data, error } = await supabase
    .rpc('obtener_estado_certificados_evento');
    
  if (error) {
    console.error('Error calling RPC:', error.message);
  } else {
    const sample = data?.[0];
    console.log('Sample row from RPC:', JSON.stringify(sample, null, 2));
    
    // Check specific people
    const target = data?.find(e => e.nombre_completo.includes('Jhon Alexander'));
    console.log('Target person from RPC:', JSON.stringify(target, null, 2));
  }
}

debugRPC();
