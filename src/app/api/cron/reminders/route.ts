import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAppointmentConfirmationTemplate } from '@/lib/whatsapp-service';
import { Message } from '@/types';

export const dynamic = 'force-dynamic'; // Prevent caching
export const maxDuration = 300; // Allow 5 minutes runtime for Vercel/similar

export async function GET() {
    try {
        console.log('⏰ Starting Reminder Job (Meta Platform Templates)...');

        // Log start to database for observability
        await supabaseAdmin.from('webhook_logs').insert({
            method: 'CRON_REMINDERS_START',
            url: '/api/cron/reminders',
            body: { timestamp: new Date().toISOString() }
        });

        // 1. Calculate the '24-hour' window
        const now = new Date();
        const startWindow = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString();
        const endWindow = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString();

        console.log(`Searching for appointments starting between ${startWindow} and ${endWindow}...`);

        // 2. Fetch appointments in that window that haven't received a reminder
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*, clients(id, whatsapp_id, name)')
            .gte('start_time', startWindow)
            .lte('start_time', endWindow)
            .in('status', ['scheduled', 'rescheduled', 'confirmed'])
            .eq('reminder_sent', false);

        if (error) {
            await supabaseAdmin.from('webhook_logs').insert({
                method: 'CRON_REMINDERS_ERROR',
                error: error.message,
                body: { step: 'FETCHING_APPOINTMENTS' }
            });
            throw error;
        }

        if (!appointments || appointments.length === 0) {
            console.log('No appointments to remind.');
            return NextResponse.json({ message: 'No appointments found' });
        }

        console.log(`Found ${appointments.length} appointments for tomorrow.`);

        // 3. Process in batches
        const BATCH_SIZE = 20;
        const results = [];
        const logsToInsert: Partial<Message>[] = [];

        for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
            const batch = appointments.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (app) => {
                const client = app.clients as any;
                if (client && client.whatsapp_id) {
                    const { data: tenant } = await supabaseAdmin
                        .from('tenants')
                        .select('ai_config')
                        .eq('id', app.tenant_id || app.cliente_id)
                        .single();

                    const aiConfig = tenant?.ai_config as any;

                    const appointmentDateTime = new Date(app.start_time);
                    const dateStr = appointmentDateTime.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        timeZone: 'Europe/Madrid'
                    });
                    const timeStr = appointmentDateTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Madrid'
                    });

                    try {
                        const vars = {
                            patient_name: client.name || 'Paciente',
                            date: dateStr,
                            time: timeStr
                        };

                        // Resilient token detection
                        const token = aiConfig?.whatsapp_keys?.access_token || aiConfig?.whatsapp_keys?.api_key;

                        const creds = {
                            phoneId: aiConfig?.whatsapp_keys?.phone_id,
                            token: token,
                            templateName: aiConfig?.whatsapp_templates?.confirmation,
                            mapping: aiConfig?.whatsapp_templates?.mapping
                        };

                        await sendAppointmentConfirmationTemplate(client.whatsapp_id, vars, creds);

                        // Update appointment status to 'confirmed'
                        await supabaseAdmin
                            .from('appointments')
                            .update({ status: 'confirmed' })
                            .eq('id', app.id);

                        const logMessage = `[TEMPLATE: ${creds.templateName || 'confirmacion_cita'}] Paciente: ${client.name}, Fecha: ${dateStr}, Hora: ${timeStr}`;

                        logsToInsert.push({
                            client_id: client.id,
                            role: 'assistant',
                            content: `[RECORDATORIO AUTOMÁTICO] ${logMessage}`,
                            created_at: new Date().toISOString(),
                            cliente_id: app.tenant_id || app.cliente_id
                        });
                        return { client: client.name, status: 'sent', id: app.id };
                    } catch (err: any) {
                        console.error(`Failed to send to app ${app.id}:`, err);
                        await supabaseAdmin.from('webhook_logs').insert({
                            method: 'CRON_REMINDERS_SEND_ERROR',
                            error: err.message,
                            body: { app_id: app.id, client: client.name }
                        });
                        return { client: client.name, status: 'failed', error: err.message };
                    }
                }
                return null;
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(Boolean));
        }

        // 4. Update reminder_sent flag
        if (results.length > 0) {
            const sentIds = results
                .filter((r: any) => r?.status === 'sent')
                .map((r: any) => r.id);
            if (sentIds.length > 0) {
                await supabaseAdmin
                    .from('appointments')
                    .update({ reminder_sent: true })
                    .in('id', sentIds);
            }
        }

        if (logsToInsert.length > 0) {
            await supabaseAdmin.from('messages').insert(logsToInsert);
        }

        // Final result log
        await supabaseAdmin.from('webhook_logs').insert({
            method: 'CRON_REMINDERS_SUCCESS',
            body: { processed: results.length, details: results }
        });

        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Reminder Error:', errorMessage);

        try {
            await supabaseAdmin.from('webhook_logs').insert({
                method: 'CRON_REMINDERS_FATAL_ERROR',
                error: errorMessage
            });
        } catch (e) { /* silent */ }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
