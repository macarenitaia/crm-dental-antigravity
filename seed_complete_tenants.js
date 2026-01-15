/**
 * COMPREHENSIVE MULTI-TENANT SEED SCRIPT
 * =======================================
 * This script:
 * 1. Audits all tables for cliente_id column
 * 2. Creates 4 new tenants with complete data:
 *    - Clinics (sedes)
 *    - Doctors
 *    - Treatments
 *    - Patients (clients)
 *    - Appointments
 *    - Messages
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 4 Distinct Tenants with unique data
const TENANTS = [
    {
        id: 'aaaa1111-1111-1111-1111-111111111111',
        nombre: 'Clínica Dental Madrid Centro',
        email: 'madrid@clinicadental.com',
        plan: 'premium',
        color: '#FF6B6B', // Red theme
        clinics: [
            { name: 'Sede Sol', address: 'Puerta del Sol 15, Madrid' },
            { name: 'Sede Retiro', address: 'Calle Alcalá 200, Madrid' }
        ],
        doctors: [
            { name: 'Dr. Carlos Martínez', specialty: 'Ortodoncia' },
            { name: 'Dra. Ana López', specialty: 'Endodoncia' }
        ],
        treatments: ['Ortodoncia Invisible', 'Brackets Metálicos', 'Endodoncia'],
        patients: [
            { name: 'Juan García Pérez', phone: '+34611111001', email: 'juan.garcia@email.com' },
            { name: 'María Rodríguez', phone: '+34611111002', email: 'maria.rod@email.com' },
            { name: 'Pedro Sánchez Ruiz', phone: '+34611111003', email: 'pedro.s@email.com' }
        ]
    },
    {
        id: 'bbbb2222-2222-2222-2222-222222222222',
        nombre: 'Clínica Barcelona Smile',
        email: 'barcelona@smile.com',
        plan: 'pro',
        color: '#4ECDC4', // Teal theme
        clinics: [
            { name: 'Sede Eixample', address: 'Passeig de Gràcia 88, Barcelona' },
            { name: 'Sede Gracia', address: 'Carrer Gran de Gràcia 50, Barcelona' },
            { name: 'Sede Badalona', address: 'Rambla de Badalona 10, Barcelona' }
        ],
        doctors: [
            { name: 'Dr. Jordi Puig', specialty: 'Implantes' },
            { name: 'Dra. Montserrat Vidal', specialty: 'Periodoncia' },
            { name: 'Dr. Marc Serra', specialty: 'Cirugía Oral' }
        ],
        treatments: ['Implante Dental', 'Limpieza Profunda', 'Blanqueamiento LED'],
        patients: [
            { name: 'Carla Martí Soler', phone: '+34622222001', email: 'carla.marti@email.com' },
            { name: 'Oriol Ferrer', phone: '+34622222002', email: 'oriol.f@email.com' },
            { name: 'Núria Pons Vila', phone: '+34622222003', email: 'nuria.pons@email.com' },
            { name: 'Pau Roca Mas', phone: '+34622222004', email: 'pau.roca@email.com' }
        ]
    },
    {
        id: 'cccc3333-3333-3333-3333-333333333333',
        nombre: 'Dental Valencia Premium',
        email: 'valencia@dentalpremium.com',
        plan: 'enterprise',
        color: '#FFE66D', // Yellow theme
        clinics: [
            { name: 'Sede Mestalla', address: 'Av. Aragón 25, Valencia' }
        ],
        doctors: [
            { name: 'Dr. Vicente Ibáñez', specialty: 'Odontopediatría' }
        ],
        treatments: ['Odontopediatría', 'Selladores', 'Fluorización'],
        patients: [
            { name: 'Laura Navarro Gil', phone: '+34633333001', email: 'laura.nav@email.com' },
            { name: 'Adrián Moreno', phone: '+34633333002', email: 'adrian.m@email.com' }
        ]
    },
    {
        id: 'dddd4444-4444-4444-4444-444444444444',
        nombre: 'Sevilla Odontología Integral',
        email: 'sevilla@odontologia.com',
        plan: 'pro',
        color: '#95E1D3', // Mint theme
        clinics: [
            { name: 'Sede Triana', address: 'Calle Betis 45, Sevilla' },
            { name: 'Sede Nervión', address: 'Av. Luis Montoto 100, Sevilla' },
            { name: 'Sede Santa Justa', address: 'Av. Kansas City 20, Sevilla' },
            { name: 'Sede Centro', address: 'Calle Sierpes 80, Sevilla' }
        ],
        doctors: [
            { name: 'Dr. Fernando Ruiz', specialty: 'Prótesis Dental' },
            { name: 'Dra. Carmen Jiménez', specialty: 'Estética Dental' },
            { name: 'Dr. Rafael Moreno', specialty: 'Ortodoncia' },
            { name: 'Dra. Isabel Torres', specialty: 'Implantes' }
        ],
        treatments: ['Prótesis Fija', 'Carillas Cerámicas', 'Diseño de Sonrisa', 'Implantes Premium'],
        patients: [
            { name: 'Antonio Vega López', phone: '+34644444001', email: 'antonio.vega@email.com' },
            { name: 'Rocío Fernández', phone: '+34644444002', email: 'rocio.f@email.com' },
            { name: 'Manuel Díaz Ruiz', phone: '+34644444003', email: 'manuel.diaz@email.com' },
            { name: 'Elena Romero', phone: '+34644444004', email: 'elena.r@email.com' },
            { name: 'Francisco López', phone: '+34644444005', email: 'fran.lopez@email.com' }
        ]
    }
];

async function auditTables() {
    console.log('\n=== 🔍 AUDITING TABLES FOR cliente_id ===\n');

    // Get all tables
    const { data: tables } = await supabase.rpc('get_all_tables_info');

    // Manually check key tables
    const tablesToCheck = [
        'tenants', 'users', 'clinics', 'doctors', 'treatments',
        'tratamientos_new', 'clients', 'appointments', 'messages',
        'conversations', 'reviews', 'review_requests'
    ];

    for (const table of tablesToCheck) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ ${table}: Error accessing - ${error.message}`);
        } else {
            const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
            const hasClienteId = columns.includes('cliente_id');
            const hasTenantId = columns.includes('tenant_id');

            if (table === 'tenants' || table === 'users') {
                console.log(`✅ ${table}: OK (special table)`);
            } else if (hasClienteId) {
                console.log(`✅ ${table}: Has cliente_id ✓`);
            } else if (hasTenantId) {
                console.log(`⚠️  ${table}: Has tenant_id (not cliente_id)`);
            } else {
                console.log(`❌ ${table}: MISSING cliente_id!`);
            }
        }
    }
}

async function clearOldData() {
    console.log('\n=== 🧹 CLEARING OLD TEST DATA ===\n');

    // Delete in correct order (respect foreign keys)
    const tables = ['messages', 'appointments', 'clients', 'doctors', 'treatments', 'tratamientos_new', 'clinics'];

    for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
            console.log(`⚠️  ${table}: ${error.message}`);
        } else {
            console.log(`✓ Cleared ${table}`);
        }
    }

    // Delete old tenants (keep any existing ones with active auth users)
    for (const t of TENANTS) {
        const { error } = await supabase.from('tenants').delete().eq('id', t.id);
        if (!error) console.log(`✓ Removed old tenant: ${t.id.slice(0, 4)}...`);
    }
}

async function createTenants() {
    console.log('\n=== 🏢 CREATING TENANTS ===\n');

    for (const t of TENANTS) {
        const { data, error } = await supabase.from('tenants').insert({
            id: t.id,
            nombre: t.nombre,
            email: t.email,
            plan: t.plan,
            active: true
        }).select().single();

        if (error) {
            console.log(`❌ ${t.nombre}: ${error.message}`);
        } else {
            console.log(`✅ ${t.nombre} (${t.id.slice(0, 4)}...)`);
        }
    }
}

async function createAuthUsersAndProfiles() {
    console.log('\n=== 👤 CREATING AUTH USERS ===\n');

    for (const t of TENANTS) {
        const email = t.email;
        const password = t.nombre.replace(/\s/g, '') + '2024';

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError && !authError.message.includes('already been registered')) {
            console.log(`❌ Auth ${email}: ${authError.message}`);
            continue;
        }

        const authUserId = authData?.user?.id;
        if (!authUserId) {
            // Try to get existing user
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existing = existingUsers?.users?.find(u => u.email === email);
            if (existing) {
                // Update users table with existing auth id
                await supabase.from('users').upsert({
                    auth_user_id: existing.id,
                    email: email,
                    name: `Admin ${t.nombre.split(' ')[0]}`,
                    role: 'admin',
                    tenant_id: t.id
                }, { onConflict: 'auth_user_id' });
                console.log(`✅ ${email} (existing)`);
            }
            continue;
        }

        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
            auth_user_id: authUserId,
            email: email,
            name: `Admin ${t.nombre.split(' ')[0]}`,
            role: 'admin',
            tenant_id: t.id
        });

        if (profileError) {
            console.log(`⚠️  Profile ${email}: ${profileError.message}`);
        } else {
            console.log(`✅ ${email} / ${password}`);
        }
    }
}

async function createClinics() {
    console.log('\n=== 🏥 CREATING CLINICS ===\n');

    const clinicIds = {}; // Store for later reference

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
                console.log(`✅ ${clinic.name} → ${t.nombre.slice(0, 20)}...`);
            }
        }
    }

    return clinicIds;
}

async function createDoctors() {
    console.log('\n=== 👨‍⚕️ CREATING DOCTORS ===\n');

    const doctorIds = {};

    for (const t of TENANTS) {
        doctorIds[t.id] = [];
        for (const doc of t.doctors) {
            const { data, error } = await supabase.from('doctors').insert({
                name: doc.name,
                specialty: doc.specialty,
                cliente_id: t.id
            }).select('id').single();

            if (error) {
                console.log(`❌ ${doc.name}: ${error.message}`);
            } else {
                doctorIds[t.id].push(data.id);
                console.log(`✅ ${doc.name} (${doc.specialty}) → ${t.nombre.slice(0, 15)}...`);
            }
        }
    }

    return doctorIds;
}

async function createTreatments() {
    console.log('\n=== 💊 CREATING TREATMENTS ===\n');

    for (const t of TENANTS) {
        for (const treatment of t.treatments) {
            const { error } = await supabase.from('tratamientos_new').insert({
                name: treatment,
                cliente_id: t.id
            });

            if (error) {
                console.log(`⚠️  ${treatment}: ${error.message}`);
            } else {
                console.log(`✅ ${treatment} → ${t.nombre.slice(0, 15)}...`);
            }
        }
    }
}

async function createPatients() {
    console.log('\n=== 👥 CREATING PATIENTS ===\n');

    const patientIds = {};

    for (const t of TENANTS) {
        patientIds[t.id] = [];
        for (const patient of t.patients) {
            const { data, error } = await supabase.from('clients').insert({
                name: patient.name,
                whatsapp_id: patient.phone,
                email: patient.email,
                cliente_id: t.id,
                status: 'active',
                last_contact: new Date().toISOString()
            }).select('id').single();

            if (error) {
                console.log(`❌ ${patient.name}: ${error.message}`);
            } else {
                patientIds[t.id].push(data.id);
                console.log(`✅ ${patient.name} → ${t.nombre.slice(0, 15)}...`);
            }
        }
    }

    return patientIds;
}

async function createAppointments(patientIds, clinicIds) {
    console.log('\n=== 📅 CREATING APPOINTMENTS ===\n');

    const statuses = ['scheduled', 'confirmed', 'completed'];
    let count = 0;

    for (const t of TENANTS) {
        const patients = patientIds[t.id] || [];
        const clinics = clinicIds[t.id] || [];

        if (patients.length === 0 || clinics.length === 0) continue;

        // Create 2-3 appointments per patient
        for (let i = 0; i < patients.length; i++) {
            const numAppts = Math.min(2 + (i % 2), 3);

            for (let j = 0; j < numAppts; j++) {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + (i * 2) + j);
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

                if (!error) count++;
            }
        }
    }

    console.log(`✅ Created ${count} appointments across all tenants`);
}

async function createMessages(patientIds) {
    console.log('\n=== 💬 CREATING MESSAGES ===\n');

    const sampleMessages = [
        { role: 'user', content: 'Hola, quisiera información sobre blanqueamiento dental' },
        { role: 'assistant', content: '¡Hola! Claro, tenemos varios tipos de blanqueamiento. ¿Cuál es tu disponibilidad para una cita?' },
        { role: 'user', content: 'El viernes por la mañana me vendría bien' },
        { role: 'assistant', content: 'Perfecto, te he reservado el viernes a las 10:00. Te enviaremos un recordatorio.' }
    ];

    let count = 0;

    for (const t of TENANTS) {
        const patients = patientIds[t.id] || [];

        for (const patientId of patients) {
            // Create 4 messages per patient
            for (let i = 0; i < sampleMessages.length; i++) {
                const msg = sampleMessages[i];
                const timestamp = new Date();
                timestamp.setMinutes(timestamp.getMinutes() - (sampleMessages.length - i) * 5);

                const { error } = await supabase.from('messages').insert({
                    client_id: patientId,
                    role: msg.role,
                    content: msg.content,
                    created_at: timestamp.toISOString(),
                    cliente_id: t.id
                });

                if (!error) count++;
            }
        }
    }

    console.log(`✅ Created ${count} messages across all tenants`);
}

async function printSummary() {
    console.log('\n\n========================================');
    console.log('              📊 SUMMARY               ');
    console.log('========================================\n');

    console.log('LOGIN CREDENTIALS:\n');
    for (const t of TENANTS) {
        const password = t.nombre.replace(/\s/g, '') + '2024';
        console.log(`📧 ${t.email}`);
        console.log(`🔑 ${password}`);
        console.log(`🏢 ${t.nombre}`);
        console.log(`   Sedes: ${t.clinics.length}, Doctores: ${t.doctors.length}, Pacientes: ${t.patients.length}`);
        console.log('');
    }

    console.log('========================================\n');
}

async function main() {
    console.log('🚀 MULTI-TENANT COMPREHENSIVE SEED SCRIPT');
    console.log('==========================================\n');

    await auditTables();
    await clearOldData();
    await createTenants();
    await createAuthUsersAndProfiles();

    const clinicIds = await createClinics();
    const doctorIds = await createDoctors();
    await createTreatments();
    const patientIds = await createPatients();
    await createAppointments(patientIds, clinicIds);
    await createMessages(patientIds);

    await printSummary();

    console.log('✅ DONE! Test by logging in with each user to verify data isolation.\n');
}

main().catch(console.error);
