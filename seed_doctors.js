/**
 * Seed doctors data for each tenant
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DOCTORS_DATA = {
    // Sevilla Dental
    'dddd4444-4444-4444-4444-444444444444': [
        { name: 'Dr. Antonio Ruiz', specialty: 'Ortodoncia', color: '#3B82F6', clinics: ['Sede Triana', 'Sede Nervión'] },
        { name: 'Dra. María López', specialty: 'Implantología', color: '#10B981', clinics: ['Sede Triana', 'Sede Centro'] },
        { name: 'Dr. Carlos Vega', specialty: 'Endodoncia', color: '#F59E0B', clinics: ['Sede Nervión', 'Sede Santa Justa'] },
        { name: 'Dra. Elena Mora', specialty: 'Odontopediatría', color: '#EC4899', clinics: ['Sede Santa Justa'] },
    ],
    // Madrid Centro
    'aaaa1111-1111-1111-1111-111111111111': [
        { name: 'Dr. Javier García', specialty: 'Ortodoncia', color: '#3B82F6', clinics: ['Sede Sol'] },
        { name: 'Dra. Laura Martín', specialty: 'Implantología', color: '#10B981', clinics: ['Sede Sol', 'Sede Retiro'] },
    ],
    // Barcelona Smile
    'bbbb2222-2222-2222-2222-222222222222': [
        { name: 'Dr. Jordi Puig', specialty: 'Implantología', color: '#3B82F6', clinics: ['Sede Eixample', 'Sede Gracia'] },
        { name: 'Dra. Montserrat Vidal', specialty: 'Periodoncia', color: '#10B981', clinics: ['Sede Eixample'] },
        { name: 'Dr. Marc Serra', specialty: 'Cirugía Oral', color: '#F59E0B', clinics: ['Sede Badalona'] },
    ],
    // Valencia
    'cccc3333-3333-3333-3333-333333333333': [
        { name: 'Dr. Pablo Navarro', specialty: 'Odontopediatría', color: '#3B82F6', clinics: ['Sede Mestalla'] },
        { name: 'Dra. Ana Sánchez', specialty: 'Ortodoncia', color: '#EC4899', clinics: ['Sede Mestalla'] },
    ],
};

async function seedDoctors() {
    console.log('👨‍⚕️ Seeding Doctors...\n');

    for (const [tenantId, doctors] of Object.entries(DOCTORS_DATA)) {
        console.log(`\n📋 Tenant: ${tenantId.slice(0, 4)}...`);

        // Get clinics for this tenant
        const { data: clinics } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('cliente_id', tenantId);

        if (!clinics || clinics.length === 0) {
            console.log('  ⚠ No clinics found, skipping');
            continue;
        }

        const clinicMap = {};
        clinics.forEach(c => clinicMap[c.name] = c.id);

        for (const doc of doctors) {
            // Create doctor
            const { data: doctor, error } = await supabase
                .from('doctors')
                .insert({
                    cliente_id: tenantId,
                    name: doc.name,
                    specialty: doc.specialty,
                    color: doc.color,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.log(`  ❌ ${doc.name}: ${error.message}`);
                continue;
            }

            console.log(`  ✅ ${doc.name} (${doc.specialty})`);

            // Link to clinics
            for (const clinicName of doc.clinics) {
                const clinicId = clinicMap[clinicName];
                if (clinicId) {
                    await supabase.from('doctor_clinics').insert({
                        doctor_id: doctor.id,
                        clinic_id: clinicId,
                        cliente_id: tenantId
                    });
                    console.log(`     → ${clinicName}`);
                }
            }
        }
    }

    console.log('\n✅ Doctors seeded!');
}

seedDoctors().catch(console.error);
