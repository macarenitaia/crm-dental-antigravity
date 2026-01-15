
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// DISABLE WHATSAPP SENDING PREVENTATIVELY
delete process.env.WHATSAPP_PHONE_ID;
delete process.env.WHATSAPP_ACCESS_TOKEN;

const TEST_SCENARIOS = [
    {
        name: "💰 The Price Shopper",
        userId: "test_price_001",
        dialogue: [
            "Hola, ¿cuánto cuestan los implantes?",
            "Uf, es caro. ¿No tenéis ofertas?",
            "Vale, ¿qué huecos tienes esta semana?"
        ]
    },
    {
        name: "🤕 The Urgent Patient",
        userId: "test_urgent_001",
        dialogue: [
            "Me duele muchísimo una muela, es urgente",
            "Mañana por la mañana por favor",
            "Sí, cógelo."
        ]
    },
    {
        name: "💳 The Financing Seeker",
        userId: "test_finance_001",
        dialogue: [
            "Quiero ponerme carillas pero me han dicho que son carísimas.",
            "Es que se me va de precio...",
            "Vale, si financiáis me interesa. ¿Tenéis hueco el próximo martes por la mañana?",
            "A las 10 me va perfecto."
        ]
    }
];

async function main() {
    // Dynamic imports allow env vars to be loaded FIRST
    // @ts-ignore
    const { processUserMessage } = await import('../src/brain/agent');
    // @ts-ignore
    const { supabaseAdmin } = await import('../src/lib/supabase-admin');

    console.log("🚦 Starting Sofia Stress Test...");

    for (const scenario of TEST_SCENARIOS) {
        console.log(`\n\n--- 🧪 SCENARIO: ${scenario.name} ---`);

        // Clean up previous test data
        // Uses supabaseAdmin (service role) to delete
        let { data: client } = await supabaseAdmin.from('clients').select('id').eq('whatsapp_id', scenario.userId).single();
        if (client) {
            console.log(`Clearing history for ${scenario.userId}...`);
            await supabaseAdmin.from('messages').delete().eq('client_id', client.id);
            await supabaseAdmin.from('appointments').delete().eq('client_id', client.id);
        }

        for (const input of scenario.dialogue) {
            console.log(`\n👤 User: ${input}`);

            try {
                const response = await processUserMessage(scenario.userId, input);
                // processUserMessage prints the response to console, but we also returning it now.
                // We print it here clearly if not null.
                if (response) {
                    console.log(`🤖 Sofia (Returned): ${response}`);
                }
            } catch (err) {
                console.error("Error in conversation:", err);
            }

            // Artificial delay
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log("\n✅ Tests Completed.");
}

main();
