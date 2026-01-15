require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repairClinics() {
    console.log('--- Repairing Clinics Table Data ---');
    const { data: clinics, error } = await supabase.from('clinics').select('*');
    if (error) {
        console.error('Error fetching clinics:', error);
        return;
    }

    for (const clinic of clinics) {
        let update = {};

        // If one is set but the other isn't, or if they are different and one is the default '000...'
        if (clinic.tenant_id && (!clinic.cliente_id || clinic.cliente_id === '00000000-0000-0000-0000-000000000000')) {
            update.cliente_id = clinic.tenant_id;
        } else if (clinic.cliente_id && (!clinic.tenant_id || clinic.tenant_id === '00000000-0000-0000-0000-000000000000')) {
            update.tenant_id = clinic.cliente_id;
        }

        if (Object.keys(update).length > 0) {
            console.log(`Updating Clinic: ${clinic.name} | Set: ${JSON.stringify(update)}`);
            const { error: updateError } = await supabase
                .from('clinics')
                .update(update)
                .eq('id', clinic.id);

            if (updateError) {
                console.error(`Error updating clinic ${clinic.id}:`, updateError);
            }
        }
    }
    console.log('Repair complete.');
}

repairClinics();
