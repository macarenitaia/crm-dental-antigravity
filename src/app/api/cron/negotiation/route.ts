import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateReschedulingProposal } from '@/lib/ai-service';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp-service';
import { AIChatQueueEntry } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
    try {
        console.log('🤖 Starting AI Negotiation Processor...');

        // 1. Fetch pending requests
        console.log('Fetching pending requests from ai_chat_queue...');
        const { data: queueEntries, error: queueError } = await supabaseAdmin
            .from('ai_chat_queue')
            .select(`
                *,
                appointments(clinic_id),
                tenants(ai_config)
            `)
            .eq('status', 'pending')
            .limit(10); // Process in small batches

        console.log(`Fetched ${queueEntries?.length || 0} entries.`);

        if (queueError) throw queueError;

        if (!queueEntries || queueEntries.length === 0) {
            return NextResponse.json({ message: 'No pending negotiations.' });
        }

        const results = [];

        for (const entry of (queueEntries as any[])) {
            const typedEntry = entry as AIChatQueueEntry;
            try {
                console.log(`[Entry ${typedEntry.id}] Starting processing...`);
                // Update status to avoid double processing
                await supabaseAdmin
                    .from('ai_chat_queue')
                    .update({ status: 'negotiating' })
                    .eq('id', typedEntry.id);
                console.log(`[Entry ${typedEntry.id}] Marked as negotiating.`);

                const { context, client_id, cliente_id } = typedEntry;
                const clinicId = typedEntry.appointments?.clinic_id;
                const ai_config = typedEntry.tenants?.ai_config;

                if (!clinicId) {
                    console.error(`[Entry ${typedEntry.id}] No clinic_id found.`);
                    continue;
                }

                // 2. Find Available Slots (Clinic-First)
                console.log(`[Entry ${typedEntry.id}] Searching available slots for clinic ${clinicId}...`);
                const { data: slots } = await supabaseAdmin
                    .from('appointments')
                    .select('start_time')
                    .eq('status', 'available')
                    .eq('clinic_id', clinicId)
                    .eq('cliente_id', cliente_id)
                    .gte('start_time', new Date().toISOString())
                    .order('start_time', { ascending: true })
                    .limit(3);

                if (!slots || slots.length === 0) {
                    console.log(`[Entry ${typedEntry.id}] No slots found.`);
                    continue;
                }
                console.log(`[Entry ${typedEntry.id}] Found ${slots.length} slots.`);

                const formattedSlots = slots.map(s => {
                    const d = new Date(s.start_time);
                    return d.toLocaleString('es-ES', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                });

                // 3. Generate and Send Proposal using DYNAMIC config
                console.log(`[Entry ${typedEntry.id}] Calling AI with dynamic prompt...`);
                const message = await generateReschedulingProposal(
                    context.patient_name,
                    context.doctor_name,
                    context.clinic_name,
                    formattedSlots,
                    ai_config?.user_prompt
                );
                console.log(`[Entry ${typedEntry.id}] OpenAI response received.`);

                // Fetch patient phone
                const { data: patient } = await supabaseAdmin
                    .from('clients')
                    .select('whatsapp_id')
                    .eq('id', client_id)
                    .single();

                if (patient?.whatsapp_id) {
                    // Use dynamic WhatsApp keys if present
                    const creds = ai_config?.whatsapp_keys ? {
                        phoneId: ai_config.whatsapp_keys.phone_id,
                        token: ai_config.whatsapp_keys.api_key
                    } : undefined;

                    console.log(`[Entry ${typedEntry.id}] Sending WhatsApp...`);
                    await sendWhatsAppTextMessage(patient.whatsapp_id, message, creds);
                    console.log(`[Entry ${typedEntry.id}] WhatsApp sent.`);

                    // Log the outgoing message
                    await supabaseAdmin.from('messages').insert({
                        client_id,
                        cliente_id,
                        role: 'assistant',
                        content: `[IA SECRETARIA] ${message}`
                    });
                } else {
                    console.warn(`[Entry ${typedEntry.id}] Patient has no whatsapp_id.`);
                }

                results.push({ id: typedEntry.id, status: 'negotiating_sent' });

            } catch (err: any) {
                console.error(`Error processing entry ${typedEntry.id}:`, err);
            }
        }

        return NextResponse.json({ success: true, processed: results });

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Negotiation Job Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
