
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findUser() {
    // Find client with wa_id ending in 2678
    // Supabase doesn't support 'endswith' easily with .like() on numeric column if verified is string or int properly.
    // Clients wa_id is TEXT usually.

    // Let's fetch all clients and filter in JS to be safe/fast for this small DB
    const { data: clients } = await supabase.from('clients').select('*');

    const target = clients.find(c => c.whatsapp_id && c.whatsapp_id.endsWith('2678'));

    if (target) {
        console.log(`FOUND: ${target.whatsapp_id} (Name: ${target.name})`);

        // Check appointments
        const { data: appts } = await supabase.from('appointments').select('*').eq('client_id', target.id);
        console.log("Appointments:", appts);
    } else {
        console.log("User 2678 NOT FOUND. (Maybe from previous random run that wasn't saved? Or suffix mismatch)");
        // Fallback: Create one if needed for the test
    }
}

findUser();
