
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processUserMessage } from '@/brain/agent';

import { supabaseAdmin } from '@/lib/supabase-admin';

const getSupabaseAdmin = () => supabaseAdmin;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'antigravity_secret_token';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;

        // Diagnostic Mode
        if (searchParams.get('debug') === 'true') {
            const diag = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                env: {
                    HAS_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    VERIFY_TOKEN_READY: !!process.env.WHATSAPP_VERIFY_TOKEN
                }
            };
            return new Response(JSON.stringify(diag), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Log verification attempt (optional but helpful)
            try {
                const supabase = getSupabaseAdmin();
                await supabase.from('webhook_logs').insert({
                    method: 'GET_VERIFY',
                    url: req.url,
                    status_code: 200
                });
            } catch (e) { console.error('Silent log fail', e); }

            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return new Response('Invalid Request', { status: 400 });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const supabase = getSupabaseAdmin();

        // Log incoming POST
        await supabase.from('webhook_logs').insert({
            method: 'POST',
            url: req.url,
            body: body
        });

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        // Handle text/image messages (AI Agent)
        if (message && (message.type === 'text' || message.type === 'image')) {
            const from = message.from;
            const text = message.text?.body || (message.type === 'image' ? '[Imagen]' : '');
            const profileName = value?.contacts?.[0]?.profile?.name;

            // Extract phone_number_id to identify which tenant this message is for
            const phoneNumberId = value?.metadata?.phone_number_id;

            // Lookup tenant by phone_number_id in their ai_config
            let tenantId: string | null = null;
            if (phoneNumberId) {
                const { data: tenants } = await supabase
                    .from('tenants')
                    .select('id, ai_config')
                    .eq('active', true);

                // Find tenant whose ai_config.whatsapp_keys.phone_id matches
                const matchingTenant = tenants?.find(t =>
                    t.ai_config?.whatsapp_keys?.phone_id === phoneNumberId
                );

                if (matchingTenant) {
                    tenantId = matchingTenant.id;
                    console.log(`[WEBHOOK] Tenant matched: ${tenantId} for phone_id: ${phoneNumberId}`);
                } else {
                    console.warn(`[WEBHOOK] No tenant found for phone_number_id: ${phoneNumberId}`);
                }
            }

            try {
                await processUserMessage(from, text, profileName, tenantId);
            } catch (err: any) {
                console.error("Agent Error:", err);
                try {
                    await supabase.from('webhook_logs').insert({
                        method: 'POST_AGENT_ERROR',
                        error: err.message,
                        body: { from, text, tenantId }
                    });
                } catch (logErr) {
                    console.error('Failed to log agent error:', logErr);
                }
            }
        }

        // Handle button clicks from templates (Confirmar/Reprogramar)
        else if (message?.type === 'button') {
            const buttonText = message.button?.text;
            const from = message.from;

            console.log(`[WEBHOOK] Button clicked: "${buttonText}" from ${from}`);

            // Find client by whatsapp_id
            const { data: clients } = await supabase
                .from('clients')
                .select('id, name, cliente_id')
                .eq('whatsapp_id', from)
                .limit(1);

            if (clients?.length) {
                const patient = clients[0];

                // Find the most recent confirmed OR scheduled appointment
                const { data: appointments } = await supabase
                    .from('appointments')
                    .select('id, start_time, status')
                    .eq('client_id', patient.id)
                    .eq('cliente_id', patient.cliente_id)
                    .in('status', ['scheduled', 'confirmed'])
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(1);

                if (appointments?.length) {
                    const appointment = appointments[0];
                    const { sendWhatsAppTextMessage } = await import('@/lib/whatsapp-service');

                    // Get tenant credentials
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('ai_config')
                        .eq('id', patient.cliente_id)
                        .single();

                    const creds = {
                        phoneId: tenant?.ai_config?.whatsapp_keys?.phone_id,
                        token: tenant?.ai_config?.whatsapp_keys?.api_key
                    };

                    if (buttonText === 'Confirmar') {
                        await supabase
                            .from('appointments')
                            .update({ status: 'confirmed' })
                            .eq('id', appointment.id);

                        await sendWhatsAppTextMessage(
                            from,
                            `✅ ¡Gracias ${patient.name}! Tu cita ha sido confirmada con éxito.`,
                            creds
                        );
                        console.log(`[WEBHOOK] Appointment ${appointment.id} confirmed for ${patient.name}`);
                    } else if (buttonText === 'Reprogramar') {
                        await supabase
                            .from('appointments')
                            .update({ status: 'needs_reschedule' })
                            .eq('id', appointment.id);

                        await sendWhatsAppTextMessage(
                            from,
                            `ℹ️ Entendido ${patient.name}. Nuestra secretaria se pondrá en contacto contigo para reprogramar tu cita.`,
                            creds
                        );
                        console.log(`[WEBHOOK] Appointment ${appointment.id} marked for reschedule`);
                    }
                } else {
                    console.warn(`[WEBHOOK] No upcoming appointment found for patient ${patient.id}`);
                }
            } else {
                console.warn(`[WEBHOOK] No client found for phone ${from}`);
            }
        }

        return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (error: any) {
        console.error('Error processing webhook POST:', error);
        try {
            const supabaseCatch = getSupabaseAdmin();
            await supabaseCatch.from('webhook_logs').insert({
                method: 'POST_INTERNAL_ERROR',
                error: error.message
            });
        } catch (logErr) {
            console.error('Failed to log POST error:', logErr);
        }
        return new Response('Internal Server Error', { status: 500 });
    }
}
