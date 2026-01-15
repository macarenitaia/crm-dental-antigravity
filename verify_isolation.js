require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const tenants = [
    { id: '11111111-1111-1111-1111-111111111111', nombre: 'Clínica Dental García' },
    { id: '22222222-2222-2222-2222-222222222222', nombre: 'Centro Odontológico Norte' },
    { id: '33333333-3333-3333-3333-333333333333', nombre: 'Sonrisa Perfecta' },
];

async function verifyDataIsolation() {
    console.log('=== MULTI-TENANT DATA ISOLATION TEST ===\n');

    let allPassed = true;

    for (const tenant of tenants) {
        console.log(`\n🔍 Testing Tenant: ${tenant.nombre}`);
        console.log(`   ID: ${tenant.id}`);
        console.log('   ----------------------------');

        // 1. Get this tenant's clinics
        const { data: clinics } = await supabase
            .from('clinics')
            .select('id, name, cliente_id')
            .eq('cliente_id', tenant.id);

        console.log(`   📍 Clinics (${clinics?.length || 0}):`);
        clinics?.forEach(c => {
            const match = c.cliente_id === tenant.id;
            console.log(`      ${match ? '✅' : '❌'} ${c.name} (cliente_id: ${c.cliente_id})`);
            if (!match) allPassed = false;
        });

        // 2. Get this tenant's doctors
        const { data: doctors } = await supabase
            .from('doctores')
            .select('id, nombre, cliente_id')
            .eq('cliente_id', tenant.id);

        console.log(`   👨‍⚕️ Doctors (${doctors?.length || 0}):`);
        doctors?.forEach(d => {
            const match = d.cliente_id === tenant.id;
            console.log(`      ${match ? '✅' : '❌'} ${d.nombre}`);
            if (!match) allPassed = false;
        });

        // 3. Get this tenant's patients
        const { data: patients } = await supabase
            .from('clients')
            .select('id, name, cliente_id')
            .eq('cliente_id', tenant.id);

        console.log(`   👥 Patients (${patients?.length || 0}):`);
        patients?.forEach(p => {
            const match = p.cliente_id === tenant.id;
            console.log(`      ${match ? '✅' : '❌'} ${p.name}`);
            if (!match) allPassed = false;
        });

        // 4. CRITICAL: Check that we DON'T get other tenant's data
        const otherTenantIds = tenants.filter(t => t.id !== tenant.id).map(t => t.id);

        const { data: leakedClinics } = await supabase
            .from('clinics')
            .select('name, cliente_id')
            .eq('cliente_id', tenant.id)
            .in('cliente_id', otherTenantIds);

        if (leakedClinics && leakedClinics.length > 0) {
            console.log(`   ❌ DATA LEAK DETECTED: Found ${leakedClinics.length} clinics from other tenants!`);
            allPassed = false;
        }
    }

    console.log('\n\n=== CROSS-TENANT ISOLATION CHECK ===\n');

    // Get ALL data and verify each row belongs to expected tenant
    const { data: allClinics } = await supabase.from('clinics').select('name, cliente_id');
    const { data: allDoctors } = await supabase.from('doctores').select('nombre, cliente_id');
    const { data: allPatients } = await supabase.from('clients').select('name, cliente_id');

    console.log('All Clinics in DB:');
    allClinics?.forEach(c => {
        const tenantName = tenants.find(t => t.id === c.cliente_id)?.nombre || 'Demo/Unknown';
        console.log(`   📍 ${c.name} → ${tenantName}`);
    });

    console.log('\nAll Doctors in DB:');
    allDoctors?.forEach(d => {
        const tenantName = tenants.find(t => t.id === d.cliente_id)?.nombre || 'Demo/Unknown';
        console.log(`   👨‍⚕️ ${d.nombre} → ${tenantName}`);
    });

    console.log('\nAll Patients in DB (with cliente_id):');
    allPatients?.slice(0, 15).forEach(p => {
        const tenantName = tenants.find(t => t.id === p.cliente_id)?.nombre || 'Demo/Unknown';
        console.log(`   👤 ${p.name} → ${tenantName}`);
    });

    console.log('\n\n=== TEST RESULT ===');
    if (allPassed) {
        console.log('✅ ALL TESTS PASSED - Data isolation is working correctly!');
    } else {
        console.log('❌ SOME TESTS FAILED - Check data isolation!');
    }
}

verifyDataIsolation();
