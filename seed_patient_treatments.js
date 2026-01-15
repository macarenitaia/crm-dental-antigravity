/**
 * SEED PATIENT TREATMENTS
 * ========================
 * Creates sample treatments for existing patients to test billing integration
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TREATMENT_TEMPLATES = [
    { name: 'Implante dental', budget: 1200, teeth: '14' },
    { name: 'Ortodoncia Invisalign', budget: 3500, teeth: 'Arcada superior' },
    { name: 'Limpieza profunda', budget: 80, teeth: 'Completa' },
    { name: 'Blanqueamiento dental', budget: 350, teeth: 'Completa' },
    { name: 'Endodoncia', budget: 450, teeth: '36' },
    { name: 'Carillas de porcelana', budget: 2800, teeth: '11,12,21,22' },
    { name: 'Brackets metálicos', budget: 2200, teeth: 'Ambas arcadas' },
    { name: 'Extracción muela del juicio', budget: 150, teeth: '18' },
    { name: 'Corona de zirconio', budget: 650, teeth: '46' },
    { name: 'Revisión semestral', budget: 45, teeth: 'N/A' },
];

async function seedTreatments() {
    console.log('🏥 Seeding patient treatments...\n');

    // Get all tenants
    const { data: tenants } = await supabase.from('tenants').select('id, nombre');
    if (!tenants || tenants.length === 0) {
        console.log('❌ No tenants found');
        return;
    }

    for (const tenant of tenants) {
        console.log(`\n📍 Tenant: ${tenant.nombre}`);

        // Get clients for this tenant
        const { data: clients } = await supabase
            .from('clients')
            .select('id, name')
            .eq('cliente_id', tenant.id)
            .limit(5);

        if (!clients || clients.length === 0) {
            console.log('   No clients found');
            continue;
        }

        // Get doctors for this tenant
        const { data: doctors } = await supabase
            .from('doctors')
            .select('id, name')
            .eq('cliente_id', tenant.id)
            .eq('is_active', true);

        // Get clinics for this tenant
        const { data: clinics } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('cliente_id', tenant.id);

        // Create treatments for each client
        for (const client of clients) {
            // Random number of treatments per client (1-3)
            const numTreatments = Math.floor(Math.random() * 3) + 1;
            const shuffled = [...TREATMENT_TEMPLATES].sort(() => 0.5 - Math.random());
            const selectedTemplates = shuffled.slice(0, numTreatments);

            for (const template of selectedTemplates) {
                const statuses = ['quoted', 'accepted', 'in_progress', 'completed'];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

                const randomDoctor = doctors?.[Math.floor(Math.random() * (doctors?.length || 1))];
                const randomClinic = clinics?.[Math.floor(Math.random() * (clinics?.length || 1))];

                // Vary the amounts slightly
                const budgetVariation = template.budget * (0.9 + Math.random() * 0.2);
                const budgetAmount = Math.round(budgetVariation * 100) / 100;

                // Calculate invoiced/paid based on status
                let invoicedAmount = 0;
                let paidAmount = 0;

                if (randomStatus === 'completed') {
                    invoicedAmount = budgetAmount;
                    paidAmount = budgetAmount;
                } else if (randomStatus === 'in_progress') {
                    invoicedAmount = Math.round(budgetAmount * 0.5 * 100) / 100;
                    paidAmount = Math.round(invoicedAmount * 0.8 * 100) / 100;
                } else if (randomStatus === 'accepted') {
                    invoicedAmount = Math.round(budgetAmount * 0.3 * 100) / 100;
                    paidAmount = invoicedAmount;
                }

                const { error } = await supabase.from('patient_treatments').insert({
                    cliente_id: tenant.id,
                    client_id: client.id,
                    doctor_id: randomDoctor?.id || null,
                    clinic_id: randomClinic?.id || null,
                    name: template.name,
                    tooth_numbers: template.teeth,
                    status: randomStatus,
                    budget_amount: budgetAmount,
                    invoiced_amount: invoicedAmount,
                    paid_amount: paidAmount,
                    budget_accepted_at: randomStatus !== 'quoted' ? new Date().toISOString() : null,
                    start_date: randomStatus !== 'quoted' ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
                    completed_at: randomStatus === 'completed' ? new Date().toISOString() : null,
                });

                if (error) {
                    console.log(`   ❌ Error creating treatment for ${client.name}: ${error.message}`);
                } else {
                    console.log(`   ✅ ${client.name}: ${template.name} (${randomStatus})`);
                }
            }
        }
    }

    console.log('\n✅ Done seeding treatments!');
}

seedTreatments().catch(console.error);
