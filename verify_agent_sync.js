
const { processUserMessage } = require('./src/brain/agent');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
process.env.WHATSAPP_ACCESS_TOKEN = env.WHATSAPP_ACCESS_TOKEN;
process.env.WHATSAPP_PHONE_ID = env.WHATSAPP_PHONE_ID;

// Mock user ID (WhatsApp number)
const TEST_WA_ID = '34606523222';
const TEST_TENANT = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

async function testBookingFlow() {
    console.log('--- STARTING VERIFICATION TEST ---');

    // 1. Initial greeting
    console.log('\nStep 1: User says Hello');
    await processUserMessage(TEST_WA_ID, "Hola Sofía", TEST_TENANT);

    // Note: We can't easily wait for the AI to "ask" for data in this script,
    // so we'll simulate the "User provides data and wants to book" step.

    console.log('\nStep 2: User says "Mi nombre es Juan Pérez, mi email es juan@example.com y quiero cita para mañana a las 10:00 para una limpieza"');
    // Note: The AI will call book_appointment with these details.
    await processUserMessage(TEST_WA_ID, "Mi nombre es Juan Pérez, mi email es juan@example.com y quiero cita para mañana a las 10:00 para una limpieza en Sede Central", TEST_TENANT);

    console.log('\n--- VERIFYING DATABASE ---');
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('whatsapp_id', TEST_WA_ID)
        .single();

    console.log('Client Name in DB:', client.name);
    console.log('Client Email in DB:', client.email);
    console.log('Client Status:', client.status);

    const { data: appt } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1);

    console.log('Latest Appointment:', appt?.[0]?.start_time, 'Reason:', appt?.[0]?.reason);

    if (client.name === 'Juan Pérez' && client.status === 'client' && appt.length > 0) {
        console.log('\n✅ VERIFICATION SUCCESSFUL!');
    } else {
        console.log('\n❌ VERIFICATION FAILED or Partially complete (check logs above).');
    }
}

testBookingFlow();
