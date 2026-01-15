
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We simulate a fetch call to the local server or just test the logic via DB direct if server is unreachable
// But testing the API endpoint is better.
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/whatsapp';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

async function verify() {
    console.log('--- STARTING WEBHOOK VERIFICATION ---');

    // 1. Setup Test Data
    const testPhone = '+123456789';
    const tenantId = '00000000-0000-0000-0000-000000000000'; // Default Demo

    // Create or find patient
    let { data: patient } = await supabase.from('clients').select('id').eq('whatsapp_id', testPhone).single();
    if (!patient) {
        const { data: newPatient } = await supabase.from('clients').insert({
            name: 'Paciente Test Webhook',
            whatsapp_id: testPhone,
            cliente_id: tenantId
        }).select().single();
        patient = newPatient;
    }

    // Create a scheduled appointment
    const { data: appointment } = await supabase.from('appointments').insert({
        client_id: patient.id,
        cliente_id: tenantId,
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        status: 'scheduled'
    }).select().single();

    console.log(`Created test appointment: ${appointment.id}`);

    // 2. Mock Webhook Payload for "Confirmar"
    const payloadConfirm = {
        entry: [{
            changes: [{
                value: {
                    messages: [{
                        from: testPhone.replace('+', ''), // Meta sends numbers without +
                        type: 'button',
                        button: { text: 'Confirmar' }
                    }]
                }
            }]
        }]
    };

    const bodyConfirm = JSON.stringify(payloadConfirm);
    const signatureConfirm = `sha256=${crypto.createHmac('sha256', APP_SECRET).update(bodyConfirm).digest('hex')}`;

    console.log('Sending mock "Confirmar" event...');
    // We try to call the endpoint. If localhost:3000 is not running, we'll get an error.
    try {
        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': signatureConfirm
            },
            body: bodyConfirm
        });

        console.log(`Status: ${res.status}`);
        const result = await res.json();
        console.log('Response:', result);

        // Verify DB
        const { data: updatedApp } = await supabase.from('appointments').select('status').eq('id', appointment.id).single();
        console.log(`Appointment Status after "Confirmar": ${updatedApp.status}`);
    } catch (err) {
        console.log('Error calling webhook (is server running?):', err.message);
    }

    console.log('--- VERIFICATION COMPLETE ---');
}

verify().catch(console.error);
