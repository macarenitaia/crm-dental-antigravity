
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugDoctors() {
    console.log('--- DEBUG DOCTORS ---');

    // 1. Get Tenants
    const { data: tenants } = await supabaseAdmin.from('tenants').select('id, nombre');
    console.log('Tenants:', tenants);

    if (tenants && tenants.length > 0) {
        for (const tenant of tenants) {
            console.log(`\nChecking Tenant: ${tenant.nombre} (${tenant.id})`);

            // 2. Check Doctors table
            const { data: doctors } = await supabaseAdmin
                .from('doctors')
                .select('*')
                .eq('cliente_id', tenant.id);

            console.log(`Doctors in 'doctors' table:`, doctors?.length || 0);
            if (doctors?.length > 0) {
                console.log('Sample doctor:', doctors[0].name, 'Active:', doctors[0].is_active);
            }

            // 3. Check doctor_clinics table
            const { data: links } = await supabaseAdmin
                .from('doctor_clinics')
                .select('*')
                .eq('cliente_id', tenant.id);
            console.log(`Links in 'doctor_clinics' table:`, links?.length || 0);
        }
    }
}

debugDoctors();
