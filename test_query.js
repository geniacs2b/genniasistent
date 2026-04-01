const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    const batchId = "ff43d219-f3fa-4924-8ec1-50d104d70e43";
    console.log("Fetching jobs for batch:", batchId);
    const { data: jobs, error } = await supabase
        .from('certificate_jobs')
        .select(`
            id, 
            status, 
            pdf_url, 
            error_log,
            participante:personas ( nombre_completo, correo ),
            email_deliveries ( status, error_log, retry_count, dispatched_at )
        `)
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("DB Error:", JSON.stringify(error, null, 2));
    } else {
        console.log(`Found ${jobs?.length} jobs.`);
    }
}
test();
