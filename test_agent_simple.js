/**
 * 🔥 PRUEBA DE FUEGO SIMPLIFICADA
 */

require('dotenv').config({ path: '.env.local' });

// Mock WhatsApp to avoid errors
jest.mock('./src/lib/whatsapp', () => ({
    sendWhatsAppMessage: async (to, text) => {
        console.log(`📱 [WhatsApp Mock] To: ${to}`);
        return { success: true };
    }
}), { virtual: true });

const TEST_TENANT_ID = 'dddd4444-4444-4444-4444-444444444444';

async function runTest() {
    // Import after mock
    const { processUserMessage } = require('./src/brain/agent');

    console.log('\n🔥 PRUEBA DE FUEGO - AGENTE SOFÍA\n');

    const tests = [
        {
            name: '1. CURIOSO INDECISO',
            phone: '+34699100001',
            messages: [
                'Hola, tengo dudas sobre el blanqueamiento',
                'Es que no sé si me merece la pena',
                'Me lo voy a pensar...'
            ]
        },
        {
            name: '2. RESERVA SIMPLE',
            phone: '+34699100002',
            messages: [
                'Hola quiero cita para una limpieza',
                'El viernes a las 11 en Sede Triana'
            ]
        },
        {
            name: '3. PREGUNTA PRECIOS',
            phone: '+34699100003',
            messages: [
                '¿Cuánto cuesta un implante?',
                'Es muy caro... ¿hay financiación?'
            ]
        }
    ];

    for (const test of tests) {
        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🧪 ${test.name}`);
        console.log('═'.repeat(50));

        for (const msg of test.messages) {
            console.log(`\n👤 User: "${msg}"`);
            console.log('─'.repeat(40));

            try {
                const response = await processUserMessage(test.phone, msg, TEST_TENANT_ID);
                console.log(`🤖 Sofía: ${response}`);
            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
            }

            await new Promise(r => setTimeout(r, 1500));
        }
    }

    console.log('\n✅ PRUEBAS COMPLETADAS\n');
}

runTest();
