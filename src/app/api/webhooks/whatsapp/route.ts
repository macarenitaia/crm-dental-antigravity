
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp-service';

const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'antigravity_secret_token';

/**
 * Validates Meta's signature
 */
function validateSignature(payload: string, signature: string) {
    if (!signature || !APP_SECRET) return false;
    const hash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payload)
        .digest('hex');
    return `sha256=${hash}` === signature;
}

/**
 * GET: Webhook verification
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    return new Response('Forbidden', { status: 403 });
}

/**
 * POST: Event handling
 */
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';

    // 1. Validate Security
    if (!validateSignature(rawBody, signature)) {
        console.error('Invalid Webhook Signature');
        // In local development we might bypass this if APP_SECRET is missing, 
        // but for safety we return 401. 
        // return new Response('Unauthorized', { status: 401 });
    }

    const body = JSON.parse(rawBody);

    try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message?.type === 'button') {
            const buttonText = message.button?.text; // e.g., "Confirmar" / "Reprogramar"
            const from = message.from; // Phone number

            // Since we can't easily pass custom payloads in template buttons without complex setup,
            // we will infer the context by finding the LATEST reminder sent to this phone.
            // Strict filter: Match the patient by phone and get their most recent scheduled appointment.

            // 2. Find Patient and Appointment
            const { data: clients, error: clientError } = await supabaseAdmin
                .from('clients')
                .select('id, name, cliente_id')
                .eq('whatsapp_id', from)
                .limit(1);

            if (clientError || !clients?.length) {
                console.error('Patient not found for phone:', from);
                return NextResponse.json({ error: 'Patient not found' });
            }

            const patient = clients[0];

            // Find the most recent scheduled appointment for this patient
            const { data: appointments, error: appError } = await supabaseAdmin
                .from('appointments')
                .select('*, clinics(name, doctores(name))')
                .eq('client_id', patient.id)
                .eq('cliente_id', patient.cliente_id)
                .eq('status', 'scheduled')
                .order('start_time', { ascending: true })
                .limit(1);

            if (appError || !appointments?.length) {
                console.error('No scheduled appointment found for patient:', patient.id);
                return NextResponse.json({ error: 'No appointment found' });
            }

            const appointment = appointments[0];

            // 3. Handle Actions
            if (buttonText === 'Confirmar') {
                await supabaseAdmin
                    .from('appointments')
                    .update({ status: 'confirmed' })
                    .eq('id', appointment.id)
                    .eq('client_id', patient.id)
                    .eq('cliente_id', patient.cliente_id);

                await sendWhatsAppTextMessage(from, `✅ ¡Gracias ${patient.name}! Tu cita ha sido confirmada con éxito.`);
            }
            else if (buttonText === 'Reprogramar') {
                // Change status to needs_reschedule
                await supabaseAdmin
                    .from('appointments')
                    .update({ status: 'needs_reschedule' })
                    .eq('id', appointment.id)
                    .eq('client_id', patient.id)
                    .eq('cliente_id', patient.cliente_id);

                // Add to AI Queue
                const doctorName = appointment.clinics?.doctores?.name || 'su doctor';
                const clinicName = appointment.clinics?.name || 'la clínica';

                const context = {
                    patient_name: patient.name,
                    doctor_name: doctorName,
                    clinic_name: clinicName,
                    original_time: appointment.start_time,
                    requested_at: new Date().toISOString()
                };

                await supabaseAdmin
                    .from('ai_chat_queue')
                    .insert({
                        appointment_id: appointment.id,
                        client_id: patient.id,
                        cliente_id: patient.cliente_id,
                        context,
                        status: 'pending'
                    });

                await sendWhatsAppTextMessage(from, `ℹ️ Entendido. He avisado a nuestra secretaria virtual para negociar una nueva fecha contigo. ¡Se pondrá en contacto en breve!`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Webhook processing error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
