/**
 * SEED KNOWLEDGE BASE - Datos específicos por tenant
 * Cada clínica tiene sus propios tratamientos, precios y FAQs
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Datos de conocimiento por tenant
const KNOWLEDGE_DATA = {
    // Madrid Centro
    'aaaa1111-1111-1111-1111-111111111111': [
        {
            title: 'Precios Ortodoncia Madrid',
            content: `PRECIOS DE ORTODONCIA - Clínica Madrid Centro:
- Brackets metálicos: 1.800€ - 2.500€ (pago inicial + cuotas)
- Brackets estéticos: 2.200€ - 3.000€
- Invisalign Express: 2.500€ - 3.500€
- Invisalign Comprehensive: 4.000€ - 5.500€
- Retenedores: 150€ - 250€
Financiación: Hasta 24 meses sin intereses con Cetelem.
Primera consulta: GRATIS con diagnóstico 3D.`
        },
        {
            title: 'Horarios Sede Sol',
            content: `HORARIO SEDE SOL (Puerta del Sol 15, Madrid):
- Lunes a Viernes: 9:00 - 20:00
- Sábados: 10:00 - 14:00
- Domingos: Cerrado
Parking concertado en Plaza Mayor (2€/hora para pacientes).
Metro: Sol (L1, L2, L3).`
        },
        {
            title: 'FAQ Madrid Centro',
            content: `PREGUNTAS FRECUENTES - Clínica Madrid Centro:
¿Cuánto dura un tratamiento de ortodoncia? Entre 12-24 meses según el caso.
¿Duele ponerse brackets? Molestias leves los primeros días, se pasan rápido.
¿Puedo comer de todo? Evita alimentos muy duros o pegajosos.
¿Cada cuánto son las revisiones? Cada 4-6 semanas.
¿Hay aparcamiento? Sí, parking concertado en Plaza Mayor.`
        }
    ],

    // Barcelona Smile
    'bbbb2222-2222-2222-2222-222222222222': [
        {
            title: 'Precios Implantes Barcelona',
            content: `PRECIOS DE IMPLANTES - Barcelona Smile:
- Implante unitario (con corona): 1.200€ - 1.800€
- Implante con injerto óseo: 1.800€ - 2.500€
- All-on-4 (arcada completa): 8.000€ - 12.000€
- All-on-6: 10.000€ - 15.000€
- Prótesis sobre implantes: 500€ - 1.200€
Garantía de por vida en implantes Straumann.
Financiación: Hasta 36 meses.`
        },
        {
            title: 'Blanqueamiento Barcelona',
            content: `BLANQUEAMIENTO DENTAL - Barcelona Smile:
- Blanqueamiento LED en clínica: 350€ (sesión 45 min, resultados inmediatos)
- Kit domiciliario con férulas: 250€
- Pack combinado clínica + casa: 450€
Promoción actual: 20% descuento al pedir cita online.
Resultados: Hasta 8 tonos más blanco.
Duración: 1-2 años según cuidados.`
        },
        {
            title: 'Especialistas Barcelona',
            content: `EQUIPO MÉDICO - Barcelona Smile:
- Dr. Jordi Puig: Implantología (20 años exp.). Máster UAB.
- Dra. Montserrat Vidal: Periodoncia. Especialista en encías.
- Dr. Marc Serra: Cirugía Oral. Muelas del juicio y casos complejos.
Todos los doctores hablan Català, Castellano e English.`
        }
    ],

    // Valencia
    'cccc3333-3333-3333-3333-333333333333': [
        {
            title: 'Odontopediatría Valencia',
            content: `ODONTOPEDIATRÍA - Dental Valencia:
Especialistas en niños desde los 3 años.
- Primera revisión infantil: GRATIS
- Selladores preventivos: 35€/diente
- Fluorización: 25€
- Empastes infantiles: desde 45€
- Extracciones de leche: 30€
Ambiente adaptado para niños con zona de juegos.
Horario especial tardes para después del cole.`
        },
        {
            title: 'Ortodoncia Infantil Valencia',
            content: `ORTODONCIA INFANTIL - Dental Valencia:
- Ortodoncia interceptiva (7-11 años): 1.500€ - 2.200€
- Brackets para adolescentes: 2.000€ - 3.000€
- Invisalign Teen: 3.500€ - 4.500€
Incluye todas las revisiones.
Financiación especial familias numerosas.`
        }
    ],

    // Sevilla
    'dddd4444-4444-4444-4444-444444444444': [
        {
            title: 'Precios Carillas Sevilla',
            content: `CARILLAS DENTALES - Sevilla Dental:
- Carillas de composite: 200€ - 350€/diente
- Carillas de porcelana: 500€ - 800€/diente
- Carillas ultrafinas (Lumineers): 700€ - 1.000€/diente
- Diseño de sonrisa completo (10 carillas): desde 4.500€
Oferta: Diseño digital GRATIS con tu presupuesto.
Duración: Composite 5-7 años, Porcelana 15-20 años.`
        },
        {
            title: 'Prótesis Sevilla',
            content: `PRÓTESIS DENTAL - Sevilla Dental:
- Prótesis removible parcial: 400€ - 800€
- Prótesis completa (dentadura): 600€ - 1.200€
- Prótesis fija sobre implantes: 2.500€ - 5.000€
- Corona de zirconio: 400€ - 600€
- Puente de 3 piezas: 1.200€ - 1.800€
Reparaciones en el día. Urgencias 24h.`
        },
        {
            title: 'Sedes Sevilla',
            content: `SEDES DE SEVILLA DENTAL:
1. SEDE TRIANA (Calle Betis 45) - Principal
   Horario: L-V 9:00-21:00, S 9:00-14:00
   Especialidades: Todas
   
2. SEDE NERVIÓN (Av. Luis Montoto 100)
   Horario: L-V 10:00-20:00
   Especialidad: Ortodoncia e Implantes
   
3. SEDE SANTA JUSTA (Av. Kansas City 20)
   Horario: L-V 9:00-19:00
   Especialidad: Odontopediatría
   
4. SEDE CENTRO (Calle Sierpes 80)
   Horario: L-S 10:00-21:00
   Especialidad: Estética Dental
   
Todas con parking gratuito para pacientes.`
        },
        {
            title: 'FAQ Sevilla',
            content: `PREGUNTAS FRECUENTES - Sevilla Dental:
¿Cuánto cuesta una limpieza? 45€, con ultrasonidos incluido.
¿Hacéis blanqueamiento? Sí, LED a 350€ con resultados en 45 min.
¿Tenéis financiación? Sí, hasta 24 meses sin intereses.
¿Puedo pagar con tarjeta? Sí, Visa, Mastercard, American Express.
¿Urgencias? 24h en Sede Triana, llama al 954 XX XX XX.
¿Aparcar? Parking gratuito para pacientes en todas las sedes.`
        }
    ]
};

async function generateEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

async function seedKnowledge() {
    console.log('🧠 SEEDING KNOWLEDGE BASE\n');

    // Clear existing
    console.log('Clearing existing knowledge...');
    await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    let total = 0;

    for (const [tenantId, items] of Object.entries(KNOWLEDGE_DATA)) {
        console.log(`\n📚 Tenant: ${tenantId.slice(0, 4)}...`);

        for (const item of items) {
            try {
                const embedding = await generateEmbedding(item.content);

                const { error } = await supabase.from('knowledge_base').insert({
                    content: item.content,
                    embedding: embedding,
                    metadata: { title: item.title },
                    cliente_id: tenantId
                });

                if (error) {
                    console.log(`  ❌ ${item.title}: ${error.message}`);
                } else {
                    console.log(`  ✅ ${item.title}`);
                    total++;
                }
            } catch (err) {
                console.log(`  ❌ ${item.title}: ${err.message}`);
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n✅ DONE! ${total} knowledge items created.`);
    console.log('\nAhora Sofia puede responder con información específica de cada clínica.');
}

seedKnowledge().catch(console.error);
