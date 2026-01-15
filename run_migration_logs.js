const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env from .env.local
const env = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('Running migration_webhook_logs.sql...');
    const sql = fs.readFileSync('migration_webhook_logs.sql', 'utf8');

    // Split by semicolons for simple execution (ignoring comments/newtubes)
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (const statement of statements) {
        console.log('Executing:', statement.slice(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
            // If exec_sql fails (it might not exist), fallback to just reporting
            console.warn('RPC exec_sql failed, trying direct query if possible or reporting to user.');
            console.error(error);
            break;
        }
    }
    console.log('Done.');
}

run();
