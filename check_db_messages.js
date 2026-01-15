
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking DB...");

    // 1. Get the client
    const { data: client } = await supabase.from('clients').select('*').eq('whatsapp_id', '34600000002').single();

    if (!client) {
        console.log("❌ Client 34600000002 NOT found.");
        return;
    }
    console.log("✅ Client found:", client.name, client.id);

    // 2. Get messages
    const { data: messages, error } = await supabase.from('messages').select('*').eq('client_id', client.id);

    if (error) console.error("Error fetching messages:", error);
    else {
        console.log(`✅ Found ${messages.length} messages:`);
        messages.forEach(m => console.log(` - [${m.role}] ${m.content}`));
    }
}

check();
