
const WA_ID = "34" + Math.floor(Math.random() * 1000000000); // Random User
const PHONE_ID = "PHONE_ID";

// Helper to wait
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
                    contacts: [{ profile: { name: "Booking Tester" }, wa_id: WA_ID }],
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
        const res = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log(`[Status]: ${res.status}`);
    } catch (e) {
        console.error("Fetch error:", e.message);
    }
}

async function runSimulation() {
    console.log("--- STARTING BOOKING SIMULATION ---");

    // Turn 1: Initial Intent
    await sendMsg("Hola, me duele mucho una muela y quiero que me veáis");
    console.log("... waiting for AI to reply (15s) ...");
    await sleep(15000);

    // Turn 2: Providing date (assume AI asked "Cuándo te viene bien?")
    // We'll calculate "tomorrow" dynamically
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await sendMsg(`Mañana ${dateStr} por la tarde a eso de las 17:00`);
    console.log("... waiting for AI to check calendar (15s) ...");
    await sleep(15000);

    // Turn 3: Confirmation (assume AI said "Tengo hueco a las 17:00, ¿te lo guardo?")
    await sendMsg("Sí, perfecto, resérvalo");
    console.log("... waiting for AI to book (15s) ...");
    await sleep(15000);

    console.log("--- SIMULATION COMPLETE ---");
}

runSimulation();
