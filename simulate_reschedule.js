
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const WA_ID = "34294452678"; // User 2678
const PHONE_ID = "PHONE_ID";

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
                    contacts: [{ profile: { name: "User 2678" }, wa_id: WA_ID }],
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

async function runRescheduleTest() {
    console.log("--- STARTING RESCHEDULE SIMULATION ---");

    // Turn 1: Request change
    await sendMsg("Hola, mira, al final no puedo ir mañana a las 17:00. ¿Me la puedes cambiar a las 12:00?");
    console.log("... waiting for AI (should Cancel + Book)... (30s)");
    await sleep(30000);

    console.log("--- TEST COMPLETE ---");
}

runRescheduleTest();
