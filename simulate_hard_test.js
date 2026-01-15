
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const WA_ID = "34666999000"; // "Hard Client"
const PHONE_ID = "PHONE_ID";

async function blockSlot() {
    console.log("🔒 Blocking tomorrow 9:00 AM slot...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Set to 09:00 Madrid (08:00 UTC)
    // We'll use the same logic: 09:00 Madrid is what we want to block.
    // In Winter (Dec), Madrid is UTC+1. So 08:00 UTC.
    tomorrow.setUTCHours(8, 0, 0, 0);

    // Create a dummy client for the blocker if needed, or link to existing
    // Let's just create a quick dummy appointment
    // We need a valid client_id. Let's pick the first one found or create one.
    let { data: client } = await supabase.from('clients').select('id').limit(1).single();

    const start = tomorrow.toISOString();
    const end = new Date(tomorrow.getTime() + 30 * 60000).toISOString();

    const { error } = await supabase.from('appointments').insert({
        client_id: client.id,
        start_time: start,
        end_time: end,
        status: 'confirmed'
    });

    if (error) console.error("Error blocking slot:", error);
    else console.log(`✅ Slot blocked: ${start} (Madrid ~09:00)`);

    return tomorrow; // Return the date object for the simulation to use context
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
                    contacts: [{ profile: { name: "Hard Client" }, wa_id: WA_ID }],
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

async function runHardTest() {
    // 1. Block the slot
    await blockSlot();

    console.log("\n--- STARTING CONFLICT SIMULATION ---");

    // Turn 1: Ask for the blocked slot
    // "Quiero cita mañana a las 9 en punto"
    await sendMsg("Hola, necesito una limpieza urgente. Quiero ir mañana a las 9:00 en punto.");
    console.log("... waiting for AI (Agent should see conflict and propose others)... (20s)");
    await sleep(20000);

    // Turn 2: User complains/negotiates
    // Agent likely proposed something else. User insists or asks for nearby time.
    await sendMsg("Uff, qué mal. ¿Y a las 9:30 se puede? Si no, dime qué tienes libre por la mañana.");
    console.log("... waiting for AI (checking 9:30)... (20s)");
    await sleep(20000);

    // Turn 3: Acceptance
    await sendMsg("Vale, venga, resérvame esa.");
    console.log("... waiting for booking... (20s)");
    await sleep(20000);

    console.log("--- TEST COMPLETE ---");
}

runHardTest();
