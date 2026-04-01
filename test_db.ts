import { createClient } from "./lib/supabaseServer";

async function test() {
  const supabase = createClient();
  const { data: config, error: configErr } = await supabase
    .from('configuracion_correo_sistema')
    .select('*');
  
  const { data: rpcData, error: rpcErr } = await supabase
    .rpc('obtener_configuracion_correo_sistema_activa');

  console.log("--- TABLE CONTENT ---");
  console.log(JSON.stringify(config, null, 2));
  console.log("Error:", configErr);
  
  console.log("\n--- RPC RESULT ---");
  console.log(JSON.stringify(rpcData, null, 2));
  console.log("Error:", rpcErr);
}

test();
