
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const WA_ID = "34666999002"; // "Complex Client"
const PHONE_ID = "PHONE_ID";

async function blockSlots(date) {
    console.log(`🔒 Blocking slots for ${date.toISOString().split('T')[0]}...`);

    let { data: client } = await supabase.from('clients').select('id').limit(1).single();

    // Block 09:00 Madrid (08:00 UTC)
    const start1 = new Date(date);
    start1.setUTCHours(8, 0, 0, 0);
    const end1 = new Date(start1.getTime() + 30 * 60000);

    // Block 18:00 Madrid (17:00 UTC)
    const start2 = new Date(date);
    start2.setUTCHours(17, 0, 0, 0);
    const end2 = new Date(start2.getTime() + 30 * 60000);

    await supabase.from('appointments').insert([
        { client_id: client.id, start_time: start1.toISOString(), end_time: end1.toISOString(), status: 'confirmed' },
        { client_id: client.id, start_time: start2.toISOString(), end_time: end2.toISOString(), status: 'confirmed' }
    ]);

    console.log("✅ Blocked 09:00 and 18:00");
}

async function sendMsg(text) {
    console.log(`\n[USER]: "${text}"`);
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            id: "WHATSAPP_ID",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "123456789", phone_number_id: PHONE_ID },
                    contacts: [{ profile: { name: "Complex Client" }, wa_id: WA_ID }],
                    messages: [{
                        from: WA_ID,
                        id: `wamid.TEST_${Date.now()}`,
                        timestamp: Date.now() / 1000,
                        text: { body: text },
                        type: "text"
                    }]
                },
                field: "messages"
            }]
        }]
    };

    try {
        await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) { console.error(e.message); }
}

async function runComplexTest() {
    console.log("--- STARTING COMPLEX NEGOTIATION ---");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await blockSlots(tomorrow);

    // Turn 1: Ask for 09:00
    await sendMsg("Hola, querría cita para mañana a las 9 de la mañana");
    console.log("... waiting for AI (should say NO to 9)... (20s)");
    await sleep(20000);

    // Turn 2: Ask for 18:00
    await sendMsg("Vaya... ¿y por la tarde a las 18:00 tenéis hueco?");
    console.log("... waiting for AI (should say NO to 18)... (20s)");
    await sleep(20000);

    // Turn 3: Ask for suggestions
    await sendMsg("Madre mía, qué difícil. Dime qué tienes libre por la tarde entonces.");
    console.log("... waiting for AI (should suggest e.g. 16:00, 17:00)... (20s)");
    await sleep(20000);

    // Turn 4: Accept
    await sendMsg("Vale, la primera que me has dicho me viene bien. Resérvala.");
    console.log("... waiting for booking... (20s)");
    await sleep(20000);

    console.log("--- COMPLEX TEST COMPLETE ---");
}

runComplexTest();
