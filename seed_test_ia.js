
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createScenario() {
    console.log('🚀 Generating Test Scenario...');
    const timestamp = Date.now();

    // 1. Create Test Tenant
    const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
        nombre: `Clinica Test IA ${timestamp}`,
        email: `test-ia-${timestamp}@example.com`,
        plan: 'pro'
    }).select().single();

    if (tErr) {
        console.error('❌ Error creating tenant:', tErr);
        return;
    }
    console.log(`✅ Tenant created: ${tenant.id}`);

    // 2. Create Test Clinic
    const { data: clinic, error: cErr } = await supabase.from('clinics').insert({
        name: `Sede Test IA ${timestamp}`,
        address: 'Calle Falsa 123',
        tenant_id: tenant.id
    }).select().single();

    if (cErr) {
        console.error('❌ Error creating clinic:', cErr);
        return;
    }
    console.log(`✅ Clinic created: ${clinic.id}`);

    // 3. Create Test Client (Patient)
    const { data: client, error: clErr } = await supabase.from('clients').insert({
        name: 'Mariano Prueba',
        whatsapp_id: `+346${timestamp.toString().slice(-8)}`,
        cliente_id: tenant.id
    }).select().single();

    if (clErr) {
        console.error('❌ Error creating client:', clErr);
        return;
    }
    console.log(`✅ Patient created: ${client.id}`);

    // 4. Create Original Appointment
    const { data: appointment, error: aErr } = await supabase.from('appointments').insert({
        client_id: client.id,
        cliente_id: tenant.id,
        clinic_id: clinic.id,
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        status: 'needs_reschedule'
    }).select().single();

    if (aErr) {
        console.error('❌ Error creating appointment:', aErr);
        return;
    }
    console.log(`✅ Original Appointment created: ${appointment.id}`);

    // 5. Create 3 AVAILABLE slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const slots = [
        {
            cliente_id: tenant.id,
            clinic_id: clinic.id,
            status: 'available',
            start_time: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
            end_time: new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString()
        },
        {
            cliente_id: tenant.id,
            clinic_id: clinic.id,
            status: 'available',
            start_time: new Date(tomorrow.setHours(12, 30, 0, 0)).toISOString(),
            end_time: new Date(tomorrow.setHours(13, 30, 0, 0)).toISOString()
        },
        {
            cliente_id: tenant.id,
            clinic_id: clinic.id,
            status: 'available',
            start_time: new Date(tomorrow.setHours(16, 0, 0, 0)).toISOString(),
            end_time: new Date(tomorrow.setHours(17, 0, 0, 0)).toISOString()
        }
    ];

    const { data: insertedSlots, error: sErr } = await supabase.from('appointments').insert(slots).select();
    if (sErr) {
        console.error('❌ Error creating slots:', sErr);
        return;
    }
    console.log(`✅ ${insertedSlots.length} available slots created.`);

    // 6. Insert into AI Chat Queue
    const { data: queueEntry, error: qErr } = await supabase.from('ai_chat_queue').insert({
        appointment_id: appointment.id,
        client_id: client.id,
        cliente_id: tenant.id,
        status: 'pending',
        context: {
            patient_name: client.name,
            doctor_name: 'Dr. Test',
            clinic_name: clinic.name,
            original_time: appointment.start_time,
            requested_at: new Date().toISOString()
        }
    }).select().single();

    if (qErr) {
        console.error('❌ Error creating queue entry:', qErr);
        return;
    }
    console.log(`✅ AI Queue Entry created: ${queueEntry.id}`);

    console.log('\n--- SCENARIO SUMMARY ---');
    console.log(`Patient: ${client.name}`);
    console.log(`Clinic: ${clinic.name}`);
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Queue Entry ID: ${queueEntry.id}`);
    console.log(`Status: PENDING`);
    console.log('------------------------\n');
}

createScenario().catch(console.error);
