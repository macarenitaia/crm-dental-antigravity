const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLogs() {
    console.log('Fetching last 5 logs from webhook_logs...');
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('Table is EMPTY.');
    } else {
        console.log('Found logs:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkLogs();
