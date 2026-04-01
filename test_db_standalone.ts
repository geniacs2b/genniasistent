import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ozkszdxwukdlmxhoiklq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a3N6ZHh3dWtkbG14aG9pa2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjk5NzAsImV4cCI6MjA4OTAwNTk3MH0.pNxETM3ynorYv-mkjk1GVNlCKAHVe_S-Jt3Qwhmme4o";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking configuracion_correo_sistema...");
  const { data: config, error: configErr } = await supabase
    .from('configuracion_correo_sistema')
    .select('*');
  
  console.log("--- TABLE CONTENT ---");
  if (configErr) console.error("Error:", configErr);
  else console.log(JSON.stringify(config, null, 2));

  console.log("\nChecking RPC...");
  const { data: rpcData, error: rpcErr } = await supabase
    .rpc('obtener_configuracion_correo_sistema_activa');

  console.log("--- RPC RESULT ---");
  if (rpcErr) console.error("Error:", rpcErr);
  else console.log(JSON.stringify(rpcData, null, 2));
}

test();
