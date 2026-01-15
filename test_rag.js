/**
 * Test RAG responses per tenant
 */

require('dotenv').config({ path: '.env.local' });

async function testRAG() {
    const { processUserMessage } = require('./src/brain/agent');

    console.log('\n🧪 TEST RAG POR TENANT\n');

    // Test Sevilla (dddd)
    console.log('=== SEVILLA DENTAL ===');
    console.log('👤 "¿Cuánto cuestan las carillas?"');
    const r1 = await processUserMessage('+34699200001', '¿Cuánto cuestan las carillas?', 'dddd4444-4444-4444-4444-444444444444');
    console.log(`🤖 ${r1?.slice(0, 200)}...\n`);

    await new Promise(r => setTimeout(r, 2000));

    // Test Barcelona (bbbb)
    console.log('=== BARCELONA SMILE ===');
    console.log('👤 "¿Cuánto cuesta un implante?"');
    const r2 = await processUserMessage('+34699200002', '¿Cuánto cuesta un implante?', 'bbbb2222-2222-2222-2222-222222222222');
    console.log(`🤖 ${r2?.slice(0, 200)}...\n`);

    await new Promise(r => setTimeout(r, 2000));

    // Test Valencia (cccc)
    console.log('=== DENTAL VALENCIA ===');
    console.log('👤 "Tengo un niño de 5 años, ¿qué tratamientos hacéis?"');
    const r3 = await processUserMessage('+34699200003', 'Tengo un niño de 5 años, ¿qué tratamientos hacéis?', 'cccc3333-3333-3333-3333-333333333333');
    console.log(`🤖 ${r3?.slice(0, 200)}...\n`);

    console.log('✅ RAG Tests Complete');
}

testRAG().catch(console.error);
