
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDoctorsV2() {
    console.log('--- STARTING DOCTORS FIX V2 ---');

    // 1. Fetch data
    const { data: doctors } = await supabase.from('doctors').select('*');
    const { data: clinics } = await supabase.from('clinics').select('*');

    console.log(`Initial state: ${doctors.length} doctors, ${clinics.length} clinics.`);

    // 2. Group doctors by name and tenant
    const groups = {};
    doctors.forEach(doc => {
        const key = `${doc.name}|${doc.cliente_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
    });

    const canonicalDoctors = [];
    const idsToDelete = [];
    const idMap = {}; // oldId -> canonicalId

    for (const key in groups) {
        const group = groups[key];
        // Sort by id or updated_at to be deterministic? 
        // Let's just pick the first one as canonical
        const canonical = group[0];
        canonicalDoctors.push(canonical);

        group.slice(1).forEach(dup => {
            idsToDelete.push(dup.id);
            idMap[dup.id] = canonical.id;
        });
        idMap[canonical.id] = canonical.id;
    }

    console.log(`Target: Delete ${idsToDelete.length} duplicates. Merge into ${canonicalDoctors.length} unique doctors.`);

    if (idsToDelete.length === 0) {
        console.log('No duplicates found. Check link associations though.');
    } else {
        // 3. Update ALL referencing tables
        const tablesToUpdate = ['appointments', 'clinical_history', 'patient_treatments'];

        for (const table of tablesToUpdate) {
            console.log(`Updating table: ${table}...`);
            const { data: records } = await supabase.from(table).select('*');
            if (!records) continue;

            let updateCount = 0;
            for (const rec of records) {
                if (rec.doctor_id && idMap[rec.doctor_id] && idMap[rec.doctor_id] !== rec.doctor_id) {
                    const { error } = await supabase.from(table).update({ doctor_id: idMap[rec.doctor_id] }).eq('id', rec.id);
                    if (!error) updateCount++;
                    else console.error(`Error updating ${table} record ${rec.id}:`, error.message);
                }
            }
            console.log(`Updated ${updateCount} records in ${table}.`);
        }

        // 4. Delete duplicates
        console.log('Deleting duplicate doctors...');
        // Clear doctor_clinics first
        await supabase.from('doctor_clinics').delete().in('doctor_id', idsToDelete);

        const { error: delError } = await supabase.from('doctors').delete().in('id', idsToDelete);
        if (delError) {
            console.error('CRITICAL: Delete failed!', delError.message);
            console.log('Hint: Check for other referencing tables like "treatment_plans" or similar.');
        } else {
            console.log('Successfully deleted duplicate doctors.');
        }
    }

    // 5. Ensure all unique doctors are linked to all clinics for their tenant
    console.log('Verifying clinic associations...');
    for (const doc of canonicalDoctors) {
        const tenantClinics = clinics.filter(c => c.cliente_id === doc.cliente_id);
        for (const clinic of tenantClinics) {
            const { data: existing } = await supabase
                .from('doctor_clinics')
                .select('*')
                .eq('doctor_id', doc.id)
                .eq('clinic_id', clinic.id)
                .single();

            if (!existing) {
                console.log(`Linking ${doc.name} to clinic ${clinic.name}`);
                await supabase.from('doctor_clinics').insert({
                    doctor_id: doc.id,
                    clinic_id: clinic.id,
                    cliente_id: doc.cliente_id
                });
            }
        }
    }

    console.log('--- FIX V2 COMPLETED ---');
}

fixDoctorsV2().catch(console.error);
