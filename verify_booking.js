
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log("Verifying Booking...");

    // 1. Find Client
    const { data: client } = await supabase.from('clients').select('*').eq('whatsapp_id', '34666777888').single();
    if (!client) {
        console.log("❌ Client not found!");
        return;
    }
    console.log(`✅ Client Found: ${client.name} (${client.id})`);

    // 2. Find Appointment
    const { data: appts } = await supabase.from('appointments')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (appts && appts.length > 0) {
        const app = appts[0];
        console.log(`✅ Appointment Found!`);
        console.log(`   - Start: ${app.start_time}`);
        console.log(`   - Status: ${app.status}`);
        console.log(`   - Created: ${app.created_at}`);
    } else {
        console.log("❌ No appointment found for this client.");
    }
}

verify();
