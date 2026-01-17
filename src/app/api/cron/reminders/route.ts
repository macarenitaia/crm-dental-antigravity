import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAppointmentConfirmationTemplate } from '@/lib/whatsapp-service';
import { Message } from '@/types';

export const dynamic = 'force-dynamic'; // Prevent caching
export const maxDuration = 300; // Allow 5 minutes runtime for Vercel/similar

export async function GET() {
    try {
        console.log('⏰ Starting Reminder Job (Meta Platform Templates)...');

        // 1. Calculate tomorrow's range
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const startOfDay = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

        // 2. Fetch appointments for tomorrow
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*, clients(id, whatsapp_id, name)')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .eq('status', 'scheduled');

        if (error) throw error;

        if (!appointments || appointments.length === 0) {
            console.log('No appointments to remind.');
            return NextResponse.json({ message: 'No appointments found' });
        }

        console.log(`Found ${appointments.length} appointments for tomorrow.`);

        // 3. Process in batches to control concurrency
        const BATCH_SIZE = 20;
        const results = [];
        const logsToInsert: Partial<Message>[] = [];

        for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
            const batch = appointments.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (app) => {
                const client = app.clients as any; // Temporary cast for joined data until better Supabase types
                if (client && client.whatsapp_id) {
                    // Fetch Tenant Config for THIS appointment
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

                        const creds = {
                            phoneId: aiConfig?.whatsapp_keys?.phone_id,
                            token: aiConfig?.whatsapp_keys?.api_key,
                            templateName: aiConfig?.whatsapp_templates?.confirmation,
                            mapping: aiConfig?.whatsapp_templates?.mapping
                        };

                        await sendAppointmentConfirmationTemplate(client.whatsapp_id, vars, creds);

                        const logMessage = `[TEMPLATE: ${creds.templateName || 'confirmacion_cita'}] Paciente: ${client.name}, Fecha: ${dateStr}, Hora: ${timeStr}`;

                        logsToInsert.push({
                            client_id: client.id,
                            role: 'assistant',
                            content: `[RECORDATORIO AUTOMÁTICO] ${logMessage}`,
                            created_at: new Date().toISOString()
                        });
                        return { client: client.name, status: 'sent', id: app.id };
                    } catch (err: any) {
                        console.error(`Failed to send to app ${app.id}:`, err);
                        return { client: client.name, status: 'failed', error: err.message };
                    }
                }
                return null;
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(Boolean));
        }

        // 4. Bulk Insert Logs
        if (logsToInsert.length > 0) {
            const { error: logError } = await supabaseAdmin
                .from('messages')
                .insert(logsToInsert);

            if (logError) console.error('Error batch inserting logs:', logError);
            else console.log(`Logged ${logsToInsert.length} messages.`);
        }

        return NextResponse.json({ success: true, processed: results.length, details: results });

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Reminder Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
