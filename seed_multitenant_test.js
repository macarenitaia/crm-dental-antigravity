require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 3 Test Tenants
const tenants = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Clínica Dental García',
        email: 'admin@clinicagarcia.com'
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        nombre: 'Centro Odontológico Norte',
        email: 'admin@odontologiconorte.com'
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        nombre: 'Sonrisa Perfecta',
        email: 'admin@sonrisaperfecta.com'
    }
];

// Data for each tenant
const dataPerTenant = {
    // TENANT 1: Clínica Dental García
    '11111111-1111-1111-1111-111111111111': {
        clinics: [
            { name: 'Sede Central García', address: 'Calle Mayor 1, Madrid' },
            { name: 'Sede García Sur', address: 'Av. Andalucía 45, Madrid' }
        ],
        doctors: [
            { nombre: 'Dr. Pedro García' },
            { nombre: 'Dra. María Sánchez' }
        ],
        treatments: [
            { nombre: 'Limpieza dental' },
            { nombre: 'Empaste' },
            { nombre: 'Blanqueamiento' }
        ],
        patients: [
            { name: 'Juan Martínez', whatsapp_id: '34600111001', status: 'client' },
            { name: 'Laura Pérez', whatsapp_id: '34600111002', status: 'client' },
            { name: 'Carlos López', whatsapp_id: '34600111003', status: 'lead' }
        ]
    },

    // TENANT 2: Centro Odontológico Norte
    '22222222-2222-2222-2222-222222222222': {
        clinics: [
            { name: 'Odontológico Norte Principal', address: 'Gran Vía 100, Barcelona' }
        ],
        doctors: [
            { nombre: 'Dr. Albert Font' },
            { nombre: 'Dra. Núria Costa' },
            { nombre: 'Dr. Marc Serra' }
        ],
        treatments: [
            { nombre: 'Ortodoncia' },
            { nombre: 'Implantes' },
            { nombre: 'Endodoncia' }
        ],
        patients: [
            { name: 'Marta Vidal', whatsapp_id: '34600222001', status: 'client' },
            { name: 'Oriol Puig', whatsapp_id: '34600222002', status: 'client' }
        ]
    },

    // TENANT 3: Sonrisa Perfecta
    '33333333-3333-3333-3333-333333333333': {
        clinics: [
            { name: 'Sonrisa Valencia', address: 'Alameda 10, Valencia' },
            { name: 'Sonrisa Alicante', address: 'Paseo Marítimo 5, Alicante' },
            { name: 'Sonrisa Murcia', address: 'Gran Vía 22, Murcia' }
        ],
        doctors: [
            { nombre: 'Dr. Vicente Ros' }
        ],
        treatments: [
            { nombre: 'Carillas' },
            { nombre: 'Periodoncia' }
        ],
        patients: [
            { name: 'Ana Beltrán', whatsapp_id: '34600333001', status: 'client' },
            { name: 'Pablo Fernández', whatsapp_id: '34600333002', status: 'lead' },
            { name: 'Lucía Martín', whatsapp_id: '34600333003', status: 'client' },
            { name: 'Diego Ruiz', whatsapp_id: '34600333004', status: 'client' }
        ]
    }
};

async function seedMultiTenantData() {
    console.log('=== MULTI-TENANT TEST DATA SEEDING ===\n');

    for (const tenant of tenants) {
        console.log(`\n📁 Creating Tenant: ${tenant.nombre}`);
        console.log(`   ID: ${tenant.id}`);

        // 1. Create Tenant
        const { error: tenantError } = await supabase
            .from('tenants')
            .upsert({ id: tenant.id, nombre: tenant.nombre, email: tenant.email, plan: 'pro' });

        if (tenantError) console.error('   ❌ Tenant error:', tenantError.message);
        else console.log('   ✅ Tenant created');

        const data = dataPerTenant[tenant.id];

        // 2. Create Clinics
        for (const clinic of data.clinics) {
            const { error } = await supabase
                .from('clinics')
                .insert({ ...clinic, cliente_id: tenant.id });
            if (error) console.error(`   ❌ Clinic error (${clinic.name}):`, error.message);
            else console.log(`   ✅ Clinic: ${clinic.name}`);
        }

        // 3. Create Doctors
        for (const doctor of data.doctors) {
            const { error } = await supabase
                .from('doctores')
                .insert({ ...doctor, cliente_id: tenant.id });
            if (error) console.error(`   ❌ Doctor error (${doctor.nombre}):`, error.message);
            else console.log(`   ✅ Doctor: ${doctor.nombre}`);
        }

        // 4. Create Treatments
        for (const treatment of data.treatments) {
            const { error } = await supabase
                .from('tratamientos_new')
                .insert({ ...treatment, cliente_id: tenant.id });
            if (error) console.error(`   ❌ Treatment error (${treatment.nombre}):`, error.message);
            else console.log(`   ✅ Treatment: ${treatment.nombre}`);
        }

        // 5. Create Patients
        for (const patient of data.patients) {
            const { error } = await supabase
                .from('clients')
                .insert({ ...patient, cliente_id: tenant.id });
            if (error) console.error(`   ❌ Patient error (${patient.name}):`, error.message);
            else console.log(`   ✅ Patient: ${patient.name}`);
        }
    }

    console.log('\n\n=== VERIFICATION ===\n');

    // Verify data per tenant
    for (const tenant of tenants) {
        console.log(`\n📊 ${tenant.nombre} (${tenant.id})`);

        const { data: clinics } = await supabase.from('clinics').select('name').eq('cliente_id', tenant.id);
        const { data: doctors } = await supabase.from('doctores').select('nombre').eq('cliente_id', tenant.id);
        const { data: treatments } = await supabase.from('tratamientos_new').select('nombre').eq('cliente_id', tenant.id);
        const { data: patients } = await supabase.from('clients').select('name').eq('cliente_id', tenant.id);

        console.log(`   Clinics: ${clinics?.length || 0} → ${clinics?.map(c => c.name).join(', ')}`);
        console.log(`   Doctors: ${doctors?.length || 0} → ${doctors?.map(d => d.nombre).join(', ')}`);
        console.log(`   Treatments: ${treatments?.length || 0} → ${treatments?.map(t => t.nombre).join(', ')}`);
        console.log(`   Patients: ${patients?.length || 0} → ${patients?.map(p => p.name).join(', ')}`);
    }

    console.log('\n✅ Multi-tenant test data seeding complete!');
}

seedMultiTenantData();
