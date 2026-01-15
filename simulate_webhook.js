
const fetch = require('node-fetch');

async function simulate() {
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            id: "WHATSAPP_BUSINESS_ID",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "123456789", phone_number_id: "PHONE_ID" },
                    contacts: [{ profile: { name: "Test User" }, wa_id: "34600000001" }],
                    messages: [{
                        from: "34600000001",
                        id: "wamid.HBgLMTIzNDU2Nzg5MA==",
                        timestamp: Date.now() / 1000,
                        text: { body: "Hola, me gustaría saber precio de un implante" },
                        type: "text"
                    }]
                },
                field: "messages"
            }]
        }]
    };

    console.log("Sending Webhook...");
    try {
        const res = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`Response: ${res.status} ${res.statusText}`);
        const txt = await res.text();
        console.log("Body:", txt);

    } catch (e) {
        console.error("Error:", e);
    }
}

simulate();
