const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
    const sql = fs.readFileSync('migration_clinic_pro_fields.sql', 'utf8');

    // Split by semicolon and run each statement if possible, or use a helper function
    // Note: Supabase doesn't have a direct 'sql' execution via JS client easily without a custom RPC.
    // I will check if I can use the migration_runner.js if it exists and how it works.
    console.log('Attempting to run migration via RPC...');

    // Most of these setups have an 'exec_sql' or similar RPC for migrations.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    console.log('Migration successful!');
}

runMigration();
