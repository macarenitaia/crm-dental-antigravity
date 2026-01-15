/**
 * SEED KNOWLEDGE BASE - Sin embeddings (versión simple)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const KNOWLEDGE_DATA = {
    'aaaa1111-1111-1111-1111-111111111111': [
        { title: 'Precios Ortodoncia', content: `PRECIOS ORTODONCIA - Clínica Madrid Centro:\n- Brackets metálicos: 1.800€ - 2.500€\n- Brackets estéticos: 2.200€ - 3.000€\n- Invisalign: 2.500€ - 5.500€\nFinanciación hasta 24 meses. Primera consulta GRATIS.` },
        { title: 'Horarios', content: `HORARIOS - Madrid Centro:\n- Sede Sol: L-V 9:00-20:00, Sáb 10:00-14:00\n- Sede Retiro: L-V 9:00-19:00\nParking concertado en Plaza Mayor.` }
    ],
    'bbbb2222-2222-2222-2222-222222222222': [
        { title: 'Precios Implantes', content: `PRECIOS IMPLANTES - Barcelona Smile:\n- Implante unitario: 1.200€ - 1.800€\n- All-on-4: 8.000€ - 12.000€\n- All-on-6: 10.000€ - 15.000€\nGarantía Straumann de por vida. Financiación 36 meses.` },
        { title: 'Blanqueamiento', content: `BLANQUEAMIENTO - Barcelona Smile:\n- LED en clínica: 350€ (45 min)\n- Kit domiciliario: 250€\n- Pack combinado: 450€\n20% descuento pidiendo cita online.` },
        { title: 'Equipo', content: `ESPECIALISTAS - Barcelona Smile:\n- Dr. Jordi Puig: Implantes (20 años exp.)\n- Dra. Montserrat Vidal: Periodoncia\n- Dr. Marc Serra: Cirugía Oral\nHablamos Català, Castellano e English.` }
    ],
    'cccc3333-3333-3333-3333-333333333333': [
        { title: 'Odontopediatría', content: `ODONTOPEDIATRÍA - Dental Valencia:\n- Primera revisión infantil: GRATIS\n- Selladores: 35€/diente\n- Fluorización: 25€\n- Empastes infantiles: desde 45€\nZona de juegos. Horario tardes para después del cole.` },
        { title: 'Ortodoncia Infantil', content: `ORTODONCIA INFANTIL - Dental Valencia:\n- Interceptiva (7-11 años): 1.500€ - 2.200€\n- Brackets adolescentes: 2.000€ - 3.000€\n- Invisalign Teen: 3.500€ - 4.500€\nDescuento familias numerosas.` }
    ],
    'dddd4444-4444-4444-4444-444444444444': [
        { title: 'Precios Carillas', content: `CARILLAS - Sevilla Dental:\n- Composite: 200€ - 350€/diente\n- Porcelana: 500€ - 800€/diente\n- Lumineers: 700€ - 1.000€/diente\n- Diseño sonrisa (10 carillas): desde 4.500€\nDiseño digital GRATIS con presupuesto.` },
        { title: 'Prótesis', content: `PRÓTESIS - Sevilla Dental:\n- Removible parcial: 400€ - 800€\n- Dentadura completa: 600€ - 1.200€\n- Sobre implantes: 2.500€ - 5.000€\n- Corona zirconio: 400€ - 600€\nReparaciones en el día. Urgencias 24h.` },
        { title: 'Sedes', content: `SEDES SEVILLA DENTAL:\n1. TRIANA (Calle Betis 45) - L-V 9-21, S 9-14 - Todas especialidades\n2. NERVIÓN (Luis Montoto 100) - L-V 10-20 - Ortodoncia/Implantes\n3. SANTA JUSTA (Kansas City 20) - L-V 9-19 - Odontopediatría\n4. CENTRO (Sierpes 80) - L-S 10-21 - Estética\nParking gratis en todas.` },
        { title: 'FAQ', content: `FAQ SEVILLA DENTAL:\n- Limpieza: 45€ con ultrasonidos\n- Blanqueamiento LED: 350€ (45 min)\n- Financiación: hasta 24 meses sin intereses\n- Urgencias: 24h en Sede Triana` }
    ]
};

async function seedSimple() {
    console.log('🧠 SEEDING KNOWLEDGE BASE (Simple)\n');

    await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✓ Cleared\n');

    let total = 0;

    for (const [tenantId, items] of Object.entries(KNOWLEDGE_DATA)) {
        console.log(`📚 Tenant: ${tenantId.slice(0, 4)}...`);

        for (const item of items) {
            const { error } = await supabase.from('knowledge_base').insert({
                content: item.content,
                metadata: { title: item.title },
                cliente_id: tenantId
            });

            if (error) {
                console.log(`  ❌ ${item.title}: ${error.message}`);
            } else {
                console.log(`  ✅ ${item.title}`);
                total++;
            }
        }
    }

    console.log(`\n✅ DONE! ${total} knowledge items created.\n`);
}

seedSimple().catch(console.error);
