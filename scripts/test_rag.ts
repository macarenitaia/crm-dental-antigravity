
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// DISABLE WHATSAPP SENDING PREVENTATIVELY
delete process.env.WHATSAPP_PHONE_ID;
delete process.env.WHATSAPP_ACCESS_TOKEN;

async function main() {
    // Dynamic imports
    // @ts-ignore
    const { processUserMessage } = await import('../src/brain/agent');

    console.log("🚦 RAG Verification Test...");

    // Test Query
    const query = "Hola, ¿cuánto cuestan los blanqueamientos?";
    const userId = "test_rag_001";

    console.log(`\n👤 User: ${query}`);
    const response = await processUserMessage(userId, query);
    console.log(`🤖 Sofia (Returned): ${response}`);

    // Check if response contains "250" (from seeded data)
    if (response && response.includes('250')) {
        console.log("✅ SUCCESS: Retrieved correct price (250€) from RAG.");
    } else {
        console.log("❌ FAILURE: Did not find the seeded price.");
    }

    console.log("\n🧪 Test 2: Financing");
    const q2 = "¿Puedo pagar a plazos?";
    console.log(`👤 User: ${q2}`);
    const r2 = await processUserMessage(userId, q2);
    console.log(`🤖 Sofia: ${r2}`);

    if (r2 && (r2.toLowerCase().includes('24 meses') || r2.toLowerCase().includes('intereses'))) {
        console.log("✅ SUCCESS: Retrieved financing info.");
    }
}

main();
