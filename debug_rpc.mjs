import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debug() {
  console.log('Intentando con un evento real...');
  const { data: evento } = await supabase.from('eventos').select('id').limit(1).single();
  
  if (evento) {
    console.log(`Usando Evento: ${evento.id}`);
    const { error } = await supabase.rpc('registrar_inscripcion_evento', {
       p_evento_id: evento.id,
       p_datos_persona: { correo: 'test@test.com' },
       p_respuestas: {}
     });
     console.log('Error con evento real:', JSON.stringify(error, null, 2));
  } else {
    console.log('No se encontró ningún evento.');
  }

  console.log('Probando verificar_correo_inscripcion (función conocida)...');
  const { data: verifyData, error: verifyError } = await supabase.rpc('verificar_correo_inscripcion', {
    p_token: 'test-token'
  });
  console.log('verificar_correo_inscripcion respondió:', !!verifyData || !!verifyError);
}

debug();
