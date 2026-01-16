
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to get keys from .env.local or import.env
let url, key;
if (fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf-8').split('\n');
    url = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
    key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY'))?.split('=')[1]?.trim();
}

if (!url || !key) {
    if (fs.existsSync('import.env')) {
        const lines = fs.readFileSync('import.env', 'utf-8').split('\n');
        url = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL'))?.split('=')[1]?.trim();
        key = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY'))?.split('=')[1]?.trim();
    }
}

async function read() {
    if (!url || !key) {
        console.error('No keys found');
        return;
    }
    const supabase = createClient(url, key);
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
read();
