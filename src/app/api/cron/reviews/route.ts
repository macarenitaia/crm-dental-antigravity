
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('🌟 Starting Review Request Job...');

        // 1. Calculate 'yesterday' to find recent completions
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

        // 2. Fetch completed appointments from yesterday
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*, clients(whatsapp_id, name)')
            .gte('end_time', startOfDay) // Ended yesterday
            .lte('end_time', endOfDay)
            .eq('status', 'completed');

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            console.log('No recent completions found.');
            return NextResponse.json({ message: 'No candidates for reviews' });
        }

        console.log(`Found ${appointments.length} candidates for reviews.`);

        // 3. Send Review Requests
        const results = [];
        const googleLink = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || '[Link a Google Maps]';

        for (const app of appointments) {
            const client = app.clients;
            if (client && client.whatsapp_id) {
                const message = `🌟 Hola ${client.name || ''}, esperamos que tu visita ayer fuera genial. \n\n¿Nos ayudarías con una reseña rápida en Google? ⭐️⭐️⭐️⭐️⭐️ es gratis y nos ayuda mucho.\n\n👉 ${googleLink}`;

                try {
                    await sendWhatsAppMessage(client.whatsapp_id, message);

                    // Log
                    await supabaseAdmin.from('messages').insert({
                        client_id: app.client_id,
                        role: 'assistant',
                        content: `[SOLICITUD RESEÑA] ${message}`
                    });

                    results.push({ client: client.name, status: 'sent' });
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
