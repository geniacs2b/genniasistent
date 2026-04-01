import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testExecSql() {
  console.log('--- Testing exec_sql RPC ---');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
  
  if (error) {
    console.error('exec_sql is not available or failed:', error.message);
    process.exit(1);
  } else {
    console.log('exec_sql is available!');
    process.exit(0);
  }
}

testExecSql();
