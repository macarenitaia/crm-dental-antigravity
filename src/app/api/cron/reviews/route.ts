
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('🌟 Starting Review Request Job...');

        // 1. Calculate the '1-hour' window
        // We look for appointments that ended between 1 and 2 hours ago
        const now = new Date();
        const startWindow = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const endWindow = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

        console.log(`Searching for appointments ended between ${startWindow} and ${endWindow}...`);

        // 2. Fetch completed appointments in that window with clinic info
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                clients(whatsapp_id, name, cliente_id),
                clinics(google_review_link, nombre)
            `)
            .gte('end_time', startWindow)
            .lte('end_time', endWindow)
            .eq('status', 'completed')
            .eq('review_sent', false);

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            console.log('No recent completions found.');
            return NextResponse.json({ message: 'No candidates for reviews' });
        }

        // Fetch all tenants configs for lookup
        const { data: tenants } = await supabaseAdmin
            .from('tenants')
            .select('id, ai_config');

        const tenantMap = new Map();
        tenants?.forEach(t => tenantMap.set(t.id, t));

        console.log(`Found ${appointments.length} candidates for reviews.`);

        // 3. Send Review Requests
        const results = [];

        for (const app of appointments) {
            const client = (app as any).clients;
            const clinic = (app as any).clinics;

            if (client && client.whatsapp_id) {
                // Determine the best link to use
                const googleLink = clinic?.google_review_link ||
                    process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ||
                    'nuestra ficha de Google';

                const message = `🌟 Hola ${client.name || ''}, esperamos que tu visita ayer en ${clinic?.nombre || 'la clínica'} fuera genial. \n\n¿Nos ayudarías con una reseña rápida en Google? ⭐️⭐️⭐️⭐️⭐️ es gratis y nos ayuda mucho.\n\n👉 ${googleLink}`;

                try {
                    // Get tenant credentials
                    const tenant = tenantMap.get(client.cliente_id);
                    let whatsappCreds;

                    if (tenant?.ai_config?.whatsapp_keys?.phone_id && tenant?.ai_config?.whatsapp_keys?.access_token) {
                        whatsappCreds = {
                            phoneId: tenant.ai_config.whatsapp_keys.phone_id,
                            token: tenant.ai_config.whatsapp_keys.access_token
                        };
                    }

                    await sendWhatsAppMessage(client.whatsapp_id, message, whatsappCreds);

                    // Mark as sent in DB
                    await supabaseAdmin
                        .from('appointments')
                        .update({ review_sent: true })
                        .eq('id', app.id);

                    // Log
                    await supabaseAdmin.from('messages').insert({
                        client_id: app.client_id,
                        role: 'assistant',
                        content: `[SOLICITUD RESEÑA] ${message}`,
                        cliente_id: client.cliente_id // ✅ Include tenant!
                    });

                    results.push({ client: client.name, status: 'sent', tenant: client.cliente_id });
                } catch (sendError: any) {
                    console.error(`Failed to send review request to ${client.name}:`, sendError);
                    results.push({ client: client.name, status: 'failed', error: sendError.message });
                }
            }
        }

        return NextResponse.json({ success: true, sent: results });

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Review Job Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
