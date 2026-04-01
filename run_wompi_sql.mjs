import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

async function runSql() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const sql = fs.readFileSync('db_wompi_schema.sql', 'utf8');
  
  console.log('Attempting to run SQL schema via exec_sql RPC...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error executing SQL:', error.message);
    process.exit(1);
  } else {
    console.log('SQL executed successfully!');
  }
}

runSql();
