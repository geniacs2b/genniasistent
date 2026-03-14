import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testSave() {
  console.log('--- Testing Registration RPC ---');
  
  // 1. Obtener un formulario real
  const { data: form } = await supabase.from('formularios').select('id, evento_id').limit(1).single();
  
  if (!form) {
    console.error('No se encontró ningún formulario para probar.');
    return;
  }

  console.log(`Usando Formulario: ${form.id}, Evento: ${form.evento_id}`);

  const payload = {
    p_formulario_id: form.id,
    p_evento_id: form.evento_id,
    p_tipo_documento: 'CC',
    p_numero_documento: '123456789' + Date.now().toString().slice(-3),
    p_nombres: 'Test User',
    p_apellidos: 'Antigravity',
    p_correo: 'test@example.com',
    p_telefono: '3000000000',
    p_empresa: 'Google',
    p_cargo: 'Bot',
    p_municipio: 'Cali',
    p_departamento: 'Valle',
    p_tratamiento_datos_aceptado: true,
    p_respuesta_json: { test: true },
    p_fuente: 'script_test',
    p_minutos_expiracion: 60
  };

  const { data, error } = await supabase.rpc('registrar_inscripcion_evento', payload);

  if (error) {
    console.error('RPC FAILED:', JSON.stringify(error, null, 2));
  } else {
    console.log('RPC SUCCESS! Data returned:', JSON.stringify(data, null, 2));
    
    // Verificar si se guardó en la tabla personas
    const { data: persona } = await supabase.from('personas').select('*').eq('correo', 'test@example.com').order('created_at', { ascending: false }).limit(1).single();
    if (persona) {
      console.log('Persona encontrada en DB:', persona.id);
    } else {
      console.warn('Persona NO encontrada en DB tras éxito de RPC.');
    }
  }
}

testSave();
