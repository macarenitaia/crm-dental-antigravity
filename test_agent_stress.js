/**
 * 🔥 PRUEBA DE FUEGO DEL AGENTE SOFÍA
 * =====================================
 * 
 * Escenarios:
 * 1. Usuario curioso pero indeciso → ¿Puede persuadirlo?
 * 2. Reserva simple → ¿Entiende sedes y horarios?
 * 3. Reprogramación → ¿Puede cancelar y re-agendar?
 * 4. Solo precios → ¿Puede vender sin asustar?
 * 5. Preguntas técnicas → ¿Usa el RAG correctamente?
 */

require('dotenv').config({ path: '.env.local' });
const { processUserMessage } = require('./src/brain/agent');

// Test tenant (Sevilla Dental - 4 sedes)
const TEST_TENANT_ID = 'dddd4444-4444-4444-4444-444444444444';

// Simulated phone numbers
const USERS = {
    curious: '+34699000001',    // Curioso pero indeciso
    booker: '+34699000002',     // Reserva simple
    rescheduler: '+34699000003', // Reprograma
    priceSeeker: '+34699000004', // Solo precios
    techie: '+34699000005'      // Preguntas técnicas
};

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConversation(name, userId, messages) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${name}`);
    console.log(`   Usuario: ${userId}`);
    console.log('='.repeat(60));

    for (const msg of messages) {
        console.log(`\n👤 Usuario: "${msg}"`);
        console.log('─'.repeat(40));

        try {
            const response = await processUserMessage(userId, msg, TEST_TENANT_ID);
            console.log(`🤖 Sofía: ${response || '(sin respuesta)'}`);
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        await delay(2000); // Wait between messages
    }

    console.log(`\n✅ Test "${name}" completado\n`);
}

async function runAllTests() {
    console.log('\n🔥🔥🔥 PRUEBA DE FUEGO - AGENTE SOFÍA 🔥🔥🔥\n');
    console.log('Tenant: Sevilla Dental (4 sedes: Triana, Nervión, Santa Justa, Centro)\n');

    // ===== TEST 1: Usuario curioso pero indeciso =====
    await testConversation(
        '1. USUARIO CURIOSO PERO INDECISO',
        USERS.curious,
        [
            'Hola, tengo unas dudas sobre blanqueamiento',
            'Es que no sé si me merece la pena, ¿funciona de verdad?',
            'Ya... pero es que es un poco caro ¿no?',
            'Me lo voy a pensar...'
        ]
    );

    // ===== TEST 2: Reserva simple con selección de sede =====
    await testConversation(
        '2. RESERVA SIMPLE CON SELECCIÓN DE SEDE',
        USERS.booker,
        [
            'Hola quiero pedir cita para una limpieza',
            'El miércoles por la mañana me viene bien',
            'En la sede de Triana please',
            'Vale perfecto, a las 10'
        ]
    );

    // ===== TEST 3: Reprogramación de cita =====
    await testConversation(
        '3. REPROGRAMACIÓN DE CITA',
        USERS.rescheduler,
        [
            'Buenos días, quiero una revisión',
            'Mañana a las 16:00 en Nervión',
            'Ay espera, mañana no puedo, ¿la podemos cambiar al viernes?',
            'A las 11 me viene mejor'
        ]
    );

    // ===== TEST 4: Solo preguntando precios =====
    await testConversation(
        '4. SOLO PREGUNTANDO PRECIOS',
        USERS.priceSeeker,
        [
            '¿Cuánto cuesta un implante dental?',
            '¿Y unas carillas?',
            'Es mucho dinero... ¿tenéis financiación?'
        ]
    );

    // ===== TEST 5: Preguntas técnicas / RAG =====
    await testConversation(
        '5. PREGUNTAS TÉCNICAS (RAG)',
        USERS.techie,
        [
            '¿Qué diferencia hay entre brackets normales y los invisibles?',
            '¿Cuánto dura un tratamiento de ortodoncia?',
            '¿Dolería mucho?'
        ]
    );

    console.log('\n' + '='.repeat(60));
    console.log('🏁 TODAS LAS PRUEBAS COMPLETADAS');
    console.log('='.repeat(60));
    console.log('\nRevisa las respuestas para verificar:');
    console.log('  ✓ ¿Persuadió al indeciso?');
    console.log('  ✓ ¿Distinguió las sedes correctamente?');
    console.log('  ✓ ¿Pudo reprogramar la cita?');
    console.log('  ✓ ¿Manejó las objeciones de precio?');
    console.log('  ✓ ¿Usó información del RAG para las preguntas técnicas?');
    console.log('');
}

runAllTests().catch(console.error);
