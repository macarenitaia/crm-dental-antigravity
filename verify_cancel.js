
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkCancellation() {
    const waId = "34294452678";
    const { data: client } = await supabase.from('clients').select('id').eq('whatsapp_id', waId).single();

    if (client) {
        const { data: appts } = await supabase.from('appointments').select('*').eq('client_id', client.id);
        console.log("Appointments for " + waId);
        appts.forEach(a => console.log(` - ${a.start_time} [${a.status}]`));
    }
}
checkCancellation();
