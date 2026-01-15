"use strict";
/**
 * SOFIA STRESS TEST - 10 Conversaciones Hard Style
 * 
 * Escenarios diseñados para poner a prueba:
 * 1. Persuasión y manejo de objeciones
 * 2. Gestión de citas y conflictos
 * 3. Negociación de precios
 * 4. Manejo de clientes difíciles
 * 
 * 4 de las 10 citas se superponen intencionalmente.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ============================================
// CONFIGURACIÓN DE CITAS SUPERPUESTAS
// ============================================
// Fecha base: próximo lunes a las 10:00
const getNextMonday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    d.setHours(10, 0, 0, 0);
    return d;
};

const CONFLICT_TIME = getNextMonday().toISOString();
console.log(`⚠️  Hora de conflicto programada: ${CONFLICT_TIME}`);

// ============================================
// 10 PERSONAS DIFÍCILES
// ============================================
const TEST_PERSONAS = [
    // --- CONFLICTO 1: Mismo horario, Sede Norte ---
    {
        id: "stress_1",
        name: "María del Carmen Rodríguez",
        phone: "34600111001",
        personality: "ESCÉPTICA_PRECIO",
        targetClinic: "Sede Norte",
        targetTime: CONFLICT_TIME, // CONFLICTO
        messages: [
            "Hola, quiero información sobre implantes pero ya me han dado presupuestos en otros sitios más baratos",
            "En otra clínica me ofrecen el implante a 600€, ustedes cuánto cobran?",
            "Es que 900€ me parece excesivo, no sé si vale la pena",
            "Vale, pero quiero la cita para el lunes a las 10 en la sede del norte, es la única hora que puedo",
            "Si no hay hueco a esa hora me voy a la otra clínica directamente"
        ]
    },
    {
        id: "stress_2",
        name: "Antonio Fernández Ruiz",
        phone: "34600111002",
        personality: "URGENTE_CONFLICTO",
        targetClinic: "Sede Norte",
        targetTime: CONFLICT_TIME, // CONFLICTO - MISMO HORARIO
        messages: [
            "URGENTE: tengo un dolor terrible en una muela, necesito que me atiendan YA",
            "No puedo esperar, me duele muchísimo. Necesito cita para el lunes a las 10 en norte",
            "Cómo que no hay hueco? Es una urgencia!",
            "Me da igual si hay alguien antes, es que no aguanto el dolor",
            "Vale, qué alternativas me das? Pero tiene que ser ESE lunes sí o sí"
        ]
    },

    // --- CONFLICTO 2: Mismo horario, Sede Centro ---
    {
        id: "stress_3",
        name: "Lucía Martínez Sánchez",
        phone: "34600111003",
        personality: "DESCONFIADA_RESEÑAS",
        targetClinic: "centro",
        targetTime: CONFLICT_TIME, // CONFLICTO
        messages: [
            "He visto que tienen algunas reseñas negativas en Google, me preocupa",
            "Una persona dice que le cobraron de más y otra que el trato fue malo",
            "No sé, es que me da desconfianza... qué garantías me dan?",
            "Bueno, si me aseguran calidad, quiero cita el lunes a las 10 en centro",
            "Espero no arrepentirme de esta decisión"
        ]
    },
    {
        id: "stress_4",
        name: "Carlos Gómez Pérez",
        phone: "34600111004",
        personality: "NEGOCIADOR_EXTREMO",
        targetClinic: "centro",
        targetTime: CONFLICT_TIME, // CONFLICTO - MISMO HORARIO
        messages: [
            "Mira, vengo de otra clínica y quiero ver si mejoran el precio",
            "Me han ofrecido ortodoncia invisible por 2500€, ustedes qué pueden hacer?",
            "Necesito mínimo un 20% de descuento para cambiarme",
            "Si me hacen descuento, cierro la cita ahora mismo para el lunes 10am en centro",
            "Sin descuento no hay trato, lo siento"
        ]
    },

    // --- CONFLICTO 3: Mismo horario, Benimaclet ---
    {
        id: "stress_5",
        name: "Elena Torres García",
        phone: "34600111005",
        personality: "INDECISA_CRONICA",
        targetClinic: "benimaclet",
        targetTime: CONFLICT_TIME, // CONFLICTO
        messages: [
            "Hola, estoy pensando en hacerme algo pero no sé qué exactamente",
            "Tengo los dientes un poco torcidos pero tampoco tanto...",
            "Es que no sé si vale la pena gastar dinero en esto",
            "A lo mejor debería esperar... o no, no sé",
            "Bueno vale, me convenciste. Ponme el lunes a las 10 en benimaclet"
        ]
    },
    {
        id: "stress_6",
        name: "Pablo Ruiz Hernández",
        phone: "34600111006",
        personality: "EXIGENTE_VIP",
        targetClinic: "benimaclet",
        targetTime: CONFLICT_TIME, // CONFLICTO - MISMO HORARIO
        messages: [
            "Soy empresario y mi tiempo vale oro. Necesito trato VIP",
            "Quiero el mejor especialista, no me importa pagar más",
            "Pero ojo, si tengo que esperar más de 5 minutos me voy",
            "Necesito cita el lunes a las 10 en benimaclet, sin excepciones",
            "Si no hay hueco, espero que me llamen cuando lo haya y cancelen a otro"
        ]
    },

    // --- SIN CONFLICTO: Escenarios de persuasión pura ---
    {
        id: "stress_7",
        name: "Carmen López Vidal",
        phone: "34600111007",
        personality: "MIEDO_DENTISTA",
        targetClinic: null, // Sin preferencia
        targetTime: null, // Flexible
        messages: [
            "Hola... es que tengo mucho miedo al dentista",
            "La última vez que fui me hicieron daño y no quiero volver",
            "Es que solo de pensarlo me dan sudores fríos",
            "Necesito que me garanticen que no va a doler",
            "Cómo trabajan ustedes? Usan anestesia buena?",
            "Vale, me lo pienso y os llamo..."
        ]
    },
    {
        id: "stress_8",
        name: "Fernando Díaz Castro",
        phone: "34600111008",
        personality: "COMPARADOR_INFINITO",
        targetClinic: null,
        targetTime: null,
        messages: [
            "Estoy pidiendo presupuestos en 5 clínicas diferentes",
            "Quiero saber exactamente qué incluye el tratamiento",
            "En la clínica X me dan esto, en la Y me dan esto otro...",
            "Necesito que me detallen TODO: materiales, garantías, revisiones...",
            "Y si luego hay complicaciones, quién paga?",
            "Voy a seguir comparando y ya os digo algo"
        ]
    },
    {
        id: "stress_9",
        name: "Silvia Moreno Blanco",
        phone: "34600111009",
        personality: "CANCELADORA_SERIAL",
        targetClinic: "Sede Norte",
        targetTime: null, // Cualquier hora disponible
        messages: [
            "Hola, quiero cita pero aviso que a veces tengo que cancelar por trabajo",
            "Ponme para esta semana... bueno, mejor la que viene",
            "Ay no, esa semana tampoco puedo, ponme para dentro de un mes",
            "Es que mi trabajo es muy impredecible, no te puedo confirmar nada",
            "Si me cobran por cancelar me busco otra clínica eh"
        ]
    },
    {
        id: "stress_10",
        name: "Roberto Navarro Gil",
        phone: "34600111010",
        personality: "AGRESIVO_IMPACIENTE",
        targetClinic: "centro",
        targetTime: null,
        messages: [
            "A ver, llevo 10 minutos esperando respuesta, esto es inaceptable",
            "En serio, qué servicio de mierda es este?",
            "Quiero hablar con el responsable, no con un bot",
            "CONTESTA DE UNA VEZ",
            "Vale ya me calmo... pero es que me ponen nervioso las esperas",
            "Perdona, dame una cita para cuando sea"
        ]
    }
];

// ============================================
// FUNCIÓN PRINCIPAL DE SIMULACIÓN
// ============================================
async function runStressTest() {
    console.log("\n🔥 INICIANDO STRESS TEST DE SOFÍA 🔥\n");
    console.log("=".repeat(60));

    // Obtener clínicas actuales
    const { data: clinics } = await supabase.from('clinics').select('id, name');
    console.log("\n📍 Clínicas disponibles:");
    clinics?.forEach(c => console.log(`   - ${c.name} (ID: ${c.id})`));

    // Mapear nombres a IDs
    const clinicMap = {};
    clinics?.forEach(c => {
        clinicMap[c.name.toLowerCase()] = c.id;
        // También mapear variantes
        if (c.name.toLowerCase().includes('norte')) clinicMap['sede norte'] = c.id;
        if (c.name.toLowerCase().includes('centro')) clinicMap['centro'] = c.id;
        if (c.name.toLowerCase().includes('benimaclet')) clinicMap['benimaclet'] = c.id;
    });

    console.log("\n" + "=".repeat(60));
    console.log("📋 RESUMEN DE ESCENARIOS:");
    console.log("=".repeat(60));

    TEST_PERSONAS.forEach((p, i) => {
        const conflictMark = p.targetTime === CONFLICT_TIME ? "⚠️ CONFLICTO" : "✅ Normal";
        console.log(`\n${i + 1}. ${p.name}`);
        console.log(`   📱 ${p.phone}`);
        console.log(`   🎭 Personalidad: ${p.personality}`);
        console.log(`   🏥 Clínica deseada: ${p.targetClinic || 'Flexible'}`);
        console.log(`   📅 Estado: ${conflictMark}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("🚀 EJECUTANDO SIMULACIONES...");
    console.log("=".repeat(60));

    // Ejecutar cada conversación
    for (const persona of TEST_PERSONAS) {
        console.log(`\n\n${"#".repeat(60)}`);
        console.log(`# CONVERSACIÓN: ${persona.name}`);
        console.log(`# Tipo: ${persona.personality}`);
        console.log(`${"#".repeat(60)}\n`);

        await simulateConversation(persona);

        // Pausa entre conversaciones para no saturar
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log("\n\n" + "=".repeat(60));
    console.log("✅ STRESS TEST COMPLETADO");
    console.log("=".repeat(60));
    console.log("\nRevisa el calendario para ver cómo Sofía gestionó los conflictos.");
}

async function simulateConversation(persona) {
    const webhookUrl = 'http://localhost:3000/api/webhook';

    for (let i = 0; i < persona.messages.length; i++) {
        const msg = persona.messages[i];
        console.log(`\n👤 [${persona.name}]: ${msg}`);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    object: 'whatsapp_business_account',
                    entry: [{
                        id: 'test_business',
                        changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '34666777888',
                                    phone_number_id: 'test_phone_id'
                                },
                                contacts: [{
                                    profile: { name: persona.name },
                                    wa_id: persona.phone
                                }],
                                messages: [{
                                    from: persona.phone,
                                    id: `stress_msg_${persona.id}_${i}_${Date.now()}`,
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    type: 'text',
                                    text: { body: msg }
                                }]
                            },
                            field: 'messages'
                        }]
                    }]
                })
            });

            if (response.ok) {
                // Esperar respuesta de Sofía
                await new Promise(r => setTimeout(r, 3000));

                // Obtener última respuesta
                const { data: messages } = await supabase
                    .from('messages')
                    .select('content')
                    .eq('sender', 'ai')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (messages?.[0]) {
                    console.log(`\n🤖 [Sofía]: ${messages[0].content.substring(0, 200)}...`);
                }
            }
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
        }

        // Pausa entre mensajes (simula tiempo de escritura)
        await new Promise(r => setTimeout(r, 1500));
    }
}

// Ejecutar
runStressTest().catch(console.error);
