import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugEvents() {
  console.log('--- Debugging Event Dates ---');
  
  const { data, error } = await supabase
    .from('eventos')
    .select('id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin')
    .limit(10);
    
  if (error) {
    console.error('Error fetching eventos:', error.message);
  } else {
    data.forEach(ev => {
      console.log(`Event: ${ev.titulo}`);
      console.log(`  fecha_inicio: ${ev.fecha_inicio}`);
      console.log(`  fecha_fin: ${ev.fecha_fin}`);
      console.log(`  hora_inicio: ${ev.hora_inicio}`);
      console.log(`  hora_fin: ${ev.hora_fin}`);
    });
  }
}

debugEvents();
