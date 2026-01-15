
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
    console.log('Checking doctors...');

    // 1. Get the demo user's tenant
    const email = 'demo@clinica.com';
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }
    console.log('Demo User:', userData);
    const tenantId = userData.tenant_id;

    // 2. Get clinics for this tenant
    const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .eq('cliente_id', tenantId);

    if (clinicsError) console.error('Error fetching clinics:', clinicsError);
    console.log('Clinics:', clinics);

    // 3. Get doctors linked to this tenant
    const { data: doctors, error: doctorsError } = await supabase
        .from('doctors')
        .select('*')
        .eq('cliente_id', tenantId);

    if (doctorsError) console.error('Error fetching doctors:', doctorsError);
    console.log('Doctors (Direct Match):', doctors);

    // 4. Get doctors via doctor_clinics
    const { data: docClinics, error: docClinicsError } = await supabase
        .from('doctor_clinics')
        .select('*, doctors(*), clinics(*)')
        .in('clinic_id', clinics?.map(c => c.id) || []);

    if (docClinicsError) console.error('Error fetching doctor_clinics:', docClinicsError);
    console.log('Doctor Clinics Links:', JSON.stringify(docClinics, null, 2));

    // Fix if needed: If there are doctors but not linked to clinics, link them.
    if (doctors && doctors.length > 0 && clinics && clinics.length > 0) {
        // Check if links exist
        if (!docClinics || docClinics.length === 0) {
            console.log('Attempting to link first doctor to first clinic...');
            const { error: insertError } = await supabase
                .from('doctor_clinics')
                .insert({
                    doctor_id: doctors[0].id,
                    clinic_id: clinics[0].id
                });
            if (insertError) console.error('Error linking:', insertError);
            else console.log('Successfully linked doctor!');
        }
    }
}

checkData();
