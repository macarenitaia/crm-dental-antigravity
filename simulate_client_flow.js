
const WA_ID = "34999888777";
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
                    contacts: [{ profile: { name: "Lead to Client Tester" }, wa_id: WA_ID }],
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
        console.error("Fetch error run dev port mismatch?:", e.message);
    }
}

async function runSimulation() {
    console.log("--- STARTING LEAD->CLIENT SIMULATION ---");

    // Turn 1: Lead creation (Should NOT appear in Client List yet)
    await sendMsg("Hola, ¿hacéis blanqueamientos?");
    console.log("... waiting for AI to reply (15s) ...");
    await sleep(20000);

    // Turn 2: Booking intent
    await sendMsg("Vale, quiero reservar para mañana a las 11:00");
    console.log("... waiting for AI to check calendar (15s) ...");
    await sleep(20000);

    // Turn 3: Confirmation -> Promotion to Client
    await sendMsg("Sí, perfecto, resérvalo");
    console.log("... waiting for AI to book and promote (15s) ...");
    await sleep(20000);

    console.log("--- SIMULATION COMPLETE ---");
}

runSimulation();
