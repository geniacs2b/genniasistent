import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  const token = process.argv[2];
  if (!token) {
    console.log("Por favor provee un token: node run-test.js <token>");
    return;
  }
  
  console.log("Verificando token:", token);
  const { data, error } = await supabase.rpc('verificar_correo_inscripcion', {
    p_token: token
  });
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Resultado:", data);
  }
}

testRPC();
