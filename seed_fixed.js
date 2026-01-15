/**
 * FIXED SEED SCRIPT - Proper timezone and 1 appointment per patient
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper: Get Madrid-adjusted date
function getMadridTime(daysFromNow, hour, minute = 0) {
    const now = new Date();
    now.setDate(now.getDate() + daysFromNow);
    now.setHours(hour, minute, 0, 0);

    // We're in UTC+1 (winter) so subtract 1 hour from local to get UTC
    const utcMs = now.getTime() - (1 * 60 * 60 * 1000);
    return new Date(utcMs).toISOString();
}

const TENANTS = [
    {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        nombre: 'Clinica Madrid Centro',
        email: 'madrid@clinica.com',
        clinics: [
            { name: 'Sede Sol', address: 'Puerta del Sol 15, Madrid' },
            { name: 'Sede Retiro', address: 'Calle Alcalá 200, Madrid' }
        ],
        patients: [
            { name: 'Juan García', phone: '+34611111001', apptHour: 9 },
            { name: 'María Rodríguez', phone: '+34611111002', apptHour: 11 },
            { name: 'Pedro Sánchez', phone: '+34611111003', apptHour: 16 }
        ]
    },
    {
        id: 'bbbb2222-2222-2222-2222-222222222222',
        nombre: 'Barcelona Smile',
        email: 'barcelona@smile.com',
        clinics: [
            { name: 'Sede Eixample', address: 'Passeig de Gràcia 88' },
            { name: 'Sede Gracia', address: 'Carrer Gran de Gràcia 50' },
            { name: 'Sede Badalona', address: 'Rambla de Badalona 10' }
        ],
        patients: [
            { name: 'Carla Martí', phone: '+34622222001', apptHour: 10 },
            { name: 'Oriol Ferrer', phone: '+34622222002', apptHour: 12 },
            { name: 'Núria Pons', phone: '+34622222003', apptHour: 15 },
            { name: 'Pau Roca', phone: '+34622222004', apptHour: 17 }
        ]
    },
    {
        id: 'cccc3333-3333-3333-3333-333333333333',
        nombre: 'Dental Valencia',
        email: 'valencia@dental.com',
        clinics: [
            { name: 'Sede Mestalla', address: 'Av. Aragón 25, Valencia' }
        ],
        patients: [
            { name: 'Laura Navarro', phone: '+34633333001', apptHour: 10 },
            { name: 'Adrián Moreno', phone: '+34633333002', apptHour: 13 }
        ]
    },
    {
        id: 'dddd4444-4444-4444-4444-444444444444',
        nombre: 'Sevilla Dental',
        email: 'sevilla@dental.com',
        clinics: [
            { name: 'Sede Triana', address: 'Calle Betis 45, Sevilla' },
            { name: 'Sede Nervión', address: 'Av. Luis Montoto 100' },
            { name: 'Sede Santa Justa', address: 'Av. Kansas City 20' },
            { name: 'Sede Centro', address: 'Calle Sierpes 80' }
        ],
        patients: [
            { name: 'Antonio Vega', phone: '+34644444001', apptHour: 9 },
            { name: 'Rocío Fernández', phone: '+34644444002', apptHour: 11 },
            { name: 'Manuel Díaz', phone: '+34644444003', apptHour: 14 },
            { name: 'Elena Romero', phone: '+34644444004', apptHour: 16 },
            { name: 'Francisco López', phone: '+34644444005', apptHour: 18 }
        ]
    }
];

async function fixAndReseed() {
    console.log('🚀 FIXED SEED SCRIPT - Madrid Timezone\n');

    // Clear old data
    console.log('=== 🧹 CLEARING DATA ===\n');
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clinics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✓ Cleared\n');

    // Create data
    for (const t of TENANTS) {
        console.log(`\n=== ${t.nombre} ===`);

        // Clinics
        const clinicIds = [];
        for (const clinic of t.clinics) {
            const { data } = await supabase.from('clinics').insert({
                name: clinic.name,
                address: clinic.address,
                cliente_id: t.id
            }).select('id').single();
            if (data) clinicIds.push(data.id);
        }
        console.log(`  ✓ ${t.clinics.length} sedes`);

        // Patients with 1 appointment each
        for (const p of t.patients) {
            // Create patient
            const { data: patient } = await supabase.from('clients').insert({
                name: p.name,
                whatsapp_id: p.phone,
                cliente_id: t.id,
                status: 'client'
            }).select('id').single();

            if (!patient) continue;

            // Create 1 appointment tomorrow at specified hour (Madrid time)
            const startTime = getMadridTime(1, p.apptHour);
            const endTime = getMadridTime(1, p.apptHour, 30);

            await supabase.from('appointments').insert({
                client_id: patient.id,
                clinic_id: clinicIds[0],
                start_time: startTime,
                end_time: endTime,
                status: 'scheduled',
                cliente_id: t.id
            });

            // Create a conversation (messages)
            const msgs = [
                { role: 'user', content: `Hola, quiero pedir cita para mañana a las ${p.apptHour}:00` },
                { role: 'assistant', content: `¡Hola ${p.name.split(' ')[0]}! Perfecto, te he reservado para mañana a las ${p.apptHour}:00 en ${t.clinics[0].name}. ¿Te viene bien? 📅` }
            ];

            for (let i = 0; i < msgs.length; i++) {
                const ts = new Date();
                ts.setMinutes(ts.getMinutes() - (msgs.length - i) * 2);
                await supabase.from('messages').insert({
                    client_id: patient.id,
                    role: msgs[i].role,
                    content: msgs[i].content,
                    created_at: ts.toISOString(),
                    cliente_id: t.id
                });
            }
        }
        console.log(`  ✓ ${t.patients.length} pacientes con cita`);
    }

    console.log('\n\n✅ DONE! Each patient now has exactly 1 appointment at the correct Madrid time.\n');
    console.log('LOGIN: Any of madrid@clinica.com, barcelona@smile.com, valencia@dental.com, sevilla@dental.com');
    console.log('PASSWORD: Demo2024!\n');
}

fixAndReseed().catch(console.error);
