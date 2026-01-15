require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkClinics() {
    console.log('--- Checking Clinics Table ---');
    const { data, error } = await supabase.from('clinics').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Found', data.length, 'clinics');
    data.forEach(c => {
        console.log(`Clinic: ${c.name} | id: ${c.id} | tenant_id: ${c.tenant_id} | cliente_id: ${c.cliente_id}`);
    });
}

checkClinics();
