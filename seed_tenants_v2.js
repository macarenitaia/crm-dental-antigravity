/**
 * CORRECTED MULTI-TENANT SEED SCRIPT
 * Based on actual database schema
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 4 Distinct Tenants
const TENANTS = [
    {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        nombre: 'Clinica Madrid Centro',
        email: 'madrid@clinica.com',
        plan: 'pro',
        clinics: [
            { name: 'Sede Sol', address: 'Puerta del Sol 15, Madrid' },
            { name: 'Sede Retiro', address: 'Calle Alcalá 200, Madrid' }
        ],
        treatments: ['Ortodoncia Invisible', 'Brackets Metálicos', 'Endodoncia'],
        patients: [
            { name: 'Juan García Pérez', phone: '+34611111001' },
            { name: 'María Rodríguez', phone: '+34611111002' },
            { name: 'Pedro Sánchez', phone: '+34611111003' }
        ]
    },
    {
        id: 'bbbb2222-2222-2222-2222-222222222222',
        nombre: 'Barcelona Smile',
        email: 'barcelona@smile.com',
        plan: 'pro',
        clinics: [
            { name: 'Sede Eixample', address: 'Passeig de Gràcia 88, Barcelona' },
            { name: 'Sede Gracia', address: 'Carrer Gran de Gràcia 50' },
            { name: 'Sede Badalona', address: 'Rambla de Badalona 10' }
        ],
        treatments: ['Implante Dental', 'Limpieza Profunda', 'Blanqueamiento LED'],
        patients: [
            { name: 'Carla Martí Soler', phone: '+34622222001' },
            { name: 'Oriol Ferrer', phone: '+34622222002' },
            { name: 'Núria Pons Vila', phone: '+34622222003' },
            { name: 'Pau Roca Mas', phone: '+34622222004' }
        ]
    },
    {
        id: 'cccc3333-3333-3333-3333-333333333333',
        nombre: 'Dental Valencia',
        email: 'valencia@dental.com',
        plan: 'pro',
        clinics: [
            { name: 'Sede Mestalla', address: 'Av. Aragón 25, Valencia' }
        ],
        treatments: ['Odontopediatría', 'Selladores', 'Fluorización'],
        patients: [
            { name: 'Laura Navarro Gil', phone: '+34633333001' },
            { name: 'Adrián Moreno', phone: '+34633333002' }
        ]
    },
    {
        id: 'dddd4444-4444-4444-4444-444444444444',
        nombre: 'Sevilla Dental',
        email: 'sevilla@dental.com',
        plan: 'pro',
        clinics: [
            { name: 'Sede Triana', address: 'Calle Betis 45, Sevilla' },
            { name: 'Sede Nervión', address: 'Av. Luis Montoto 100, Sevilla' },
            { name: 'Sede Santa Justa', address: 'Av. Kansas City 20' },
            { name: 'Sede Centro', address: 'Calle Sierpes 80, Sevilla' }
        ],
        treatments: ['Prótesis Fija', 'Carillas Cerámicas', 'Diseño de Sonrisa'],
        patients: [
            { name: 'Antonio Vega López', phone: '+34644444001' },
            { name: 'Rocío Fernández', phone: '+34644444002' },
            { name: 'Manuel Díaz Ruiz', phone: '+34644444003' },
            { name: 'Elena Romero', phone: '+34644444004' },
            { name: 'Francisco López', phone: '+34644444005' }
        ]
    }
];

async function clearAndSeed() {
    console.log('🚀 MULTI-TENANT SEED SCRIPT (CORRECTED)\n');

    // --- STEP 1: Clear existing data ---
    console.log('=== 🧹 CLEARING OLD DATA ===\n');

    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tratamientos_new').delete().neq('id', '0');
    await supabase.from('clinics').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Delete old test tenants
    for (const t of TENANTS) {
        await supabase.from('users').delete().eq('tenant_id', t.id);
        await supabase.from('tenants').delete().eq('id', t.id);
    }
    console.log('✓ Cleared old data\n');

    // --- STEP 2: Create Tenants ---
    console.log('=== 🏢 CREATING TENANTS ===\n');

    for (const t of TENANTS) {
        const { error } = await supabase.from('tenants').insert({
            id: t.id,
            nombre: t.nombre,
            email: t.email,
            plan: t.plan,
            active: true
        });

        if (error) {
            console.log(`❌ ${t.nombre}: ${error.message}`);
        } else {
            console.log(`✅ ${t.nombre}`);
        }
    }

    // --- STEP 3: Create Auth Users ---
    console.log('\n=== 👤 CREATING AUTH USERS ===\n');

    for (const t of TENANTS) {
        const email = t.email;
        const password = 'Demo2024!'; // Simple password for all test users

        // Check if user exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let authUser = existingUsers?.users?.find(u => u.email === email);

        if (!authUser) {
            // Create new auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (authError) {
                console.log(`❌ Auth ${email}: ${authError.message}`);
                continue;
            }
            authUser = authData.user;
        }

        // Create/Update user profile
        const { error: profileError } = await supabase.from('users').upsert({
            auth_user_id: authUser.id,
            email: email,
            name: `Admin ${t.nombre.split(' ')[0]}`,
            role: 'admin',
            tenant_id: t.id
        }, { onConflict: 'auth_user_id' });

        if (profileError) {
            console.log(`⚠️  Profile ${email}: ${profileError.message}`);
        } else {
            console.log(`✅ ${email} / ${password}`);
        }
    }

    // --- STEP 4: Create Clinics ---
    console.log('\n=== 🏥 CREATING CLINICS ===\n');

    const clinicIds = {};

    for (const t of TENANTS) {
        clinicIds[t.id] = [];
        for (const clinic of t.clinics) {
            const { data, error } = await supabase.from('clinics').insert({
                name: clinic.name,
                address: clinic.address,
                cliente_id: t.id
            }).select('id').single();

            if (error) {
                console.log(`❌ ${clinic.name}: ${error.message}`);
            } else {
                clinicIds[t.id].push(data.id);
                console.log(`✅ ${clinic.name} → ${t.nombre}`);
            }
        }
    }

    // --- STEP 5: Create Treatments ---
    console.log('\n=== 💊 CREATING TREATMENTS ===\n');

    for (const t of TENANTS) {
        for (const treatment of t.treatments) {
            const { error } = await supabase.from('tratamientos_new').insert({
                nombre: treatment,  // Correct column name!
                cliente_id: t.id
            });

            if (error) {
                console.log(`⚠️  ${treatment}: ${error.message}`);
            } else {
                console.log(`✅ ${treatment} → ${t.nombre}`);
            }
        }
    }

    // --- STEP 6: Create Patients ---
    console.log('\n=== 👥 CREATING PATIENTS ===\n');

    const patientIds = {};

    for (const t of TENANTS) {
        patientIds[t.id] = [];
        for (const patient of t.patients) {
            const { data, error } = await supabase.from('clients').insert({
                name: patient.name,
                whatsapp_id: patient.phone,
                cliente_id: t.id,
                status: 'active'
            }).select('id').single();

            if (error) {
                console.log(`❌ ${patient.name}: ${error.message}`);
            } else {
                patientIds[t.id].push(data.id);
                console.log(`✅ ${patient.name} → ${t.nombre}`);
            }
        }
    }

    // --- STEP 7: Create Appointments ---
    console.log('\n=== 📅 CREATING APPOINTMENTS ===\n');

    const statuses = ['scheduled', 'confirmed', 'completed'];
    let apptCount = 0;

    for (const t of TENANTS) {
        const patients = patientIds[t.id] || [];
        const clinics = clinicIds[t.id] || [];

        if (patients.length === 0 || clinics.length === 0) continue;

        for (let i = 0; i < patients.length; i++) {
            const numAppts = 2;

            for (let j = 0; j < numAppts; j++) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + i + j);
                startDate.setHours(9 + j * 2, 0, 0, 0);

                const endDate = new Date(startDate);
                endDate.setHours(endDate.getHours() + 1);

                const { error } = await supabase.from('appointments').insert({
                    client_id: patients[i],
                    clinic_id: clinics[j % clinics.length],
                    start_time: startDate.toISOString(),
                    end_time: endDate.toISOString(),
                    status: statuses[j % statuses.length],
                    cliente_id: t.id
                });

                if (!error) apptCount++;
            }
        }
    }
    console.log(`✅ Created ${apptCount} appointments\n`);

    // --- STEP 8: Create Messages ---
    console.log('=== 💬 CREATING MESSAGES ===\n');

    const messages = [
        { role: 'user', content: 'Hola, quisiera info sobre blanqueamiento' },
        { role: 'assistant', content: '¡Hola! Claro, ¿cuándo te viene bien?' },
        { role: 'user', content: 'El viernes por la mañana' },
        { role: 'assistant', content: 'Perfecto, te apunto a las 10:00' }
    ];

    let msgCount = 0;

    for (const t of TENANTS) {
        const patients = patientIds[t.id] || [];

        for (const patientId of patients) {
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i];
                const ts = new Date();
                ts.setMinutes(ts.getMinutes() - (messages.length - i) * 5);

                const { error } = await supabase.from('messages').insert({
                    client_id: patientId,
                    role: msg.role,
                    content: msg.content,
                    created_at: ts.toISOString(),
                    cliente_id: t.id
                });

                if (!error) msgCount++;
            }
        }
    }
    console.log(`✅ Created ${msgCount} messages\n`);

    // --- SUMMARY ---
    console.log('\n========================================');
    console.log('         📊 LOGIN CREDENTIALS          ');
    console.log('========================================\n');

    for (const t of TENANTS) {
        console.log(`📧 ${t.email}`);
        console.log(`🔑 Demo2024!`);
        console.log(`🏢 ${t.nombre}`);
        console.log(`   Sedes: ${t.clinics.length}, Pacientes: ${t.patients.length}`);
        console.log('');
    }

    console.log('========================================');
    console.log('✅ DONE! Login with each user to verify isolation.\n');
}

clearAndSeed().catch(console.error);
