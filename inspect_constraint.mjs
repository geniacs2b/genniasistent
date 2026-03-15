import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectConstraint() {
  const { data, error } = await supabase.rpc('get_sql', {
    sql: `
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conname = 'chk_estado_verificacion';
    `
  });

  if (error) {
    // If get_sql doesn't work, try a direct query via maybe a hidden endpoint if possible, 
    // or just assume we might need to find where it was defined.
    // Since I can't run arbitrary SQL easily without a helper RPC, I'll try to find it in the files first.
    console.log("Error querying constraint:", error);
  } else {
    console.log("Constraint definition:", data);
  }
}

inspectConstraint();
