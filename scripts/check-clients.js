
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClients() {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) console.error(error);
    else console.log('Clients:', data);
}

checkClients();
