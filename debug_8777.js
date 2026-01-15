
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log("Debugging User 8777...");

    // 1. Find Client by phone (suffix 8777)
    // The previous script used WA_ID = "34999888777"
    const waId = "34999888777";

    const { data: client } = await supabase.from('clients').select('*').eq('whatsapp_id', waId).single();

    if (!client) {
        console.log("❌ Client NOT found for WA_ID:", waId);
        return;
    }
    console.log(`✅ Client Found: ID=${client.id}, Name=${client.name}, Status=${client.status}`);

    // 2. Check Appointments
    const { data: appts } = await supabase.from('appointments').select('*').eq('client_id', client.id);
    console.log(`🔎 Appointments found: ${appts?.length || 0}`);
    appts?.forEach(a => console.log(`   - ${a.start_time} [${a.status}]`));

    // 3. Check Messages
    const { data: msgs } = await supabase.from('messages').select('*').eq('client_id', client.id).order('created_at');
    console.log(`🔎 Messages found: ${msgs?.length || 0}`);
    msgs?.forEach(m => console.log(`   [${m.role}] ${m.content.substring(0, 50)}...`));
}

debug();
