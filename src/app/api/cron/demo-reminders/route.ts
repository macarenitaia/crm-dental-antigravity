import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendAppointmentConfirmationTemplate } from '@/lib/whatsapp-service';
import { Message } from '@/types';

export const dynamic = 'force-dynamic'; // Prevent caching
export const maxDuration = 60;

/**
 * ⚠️ RECORDATORIO "DEMO" — SOLO PARA LA PRUEBA / DEMO COMERCIAL ⚠️
 *
 * A diferencia del cron real (/api/cron/reminders), que envía la plantilla 20-28h
 * antes de la cita, este endpoint la envía ~2 minutos DESPUÉS de que la conversación
 * del paciente quede en silencio (es decir: 2 min sin nuevos mensajes del paciente),
 * siempre que tenga una cita futura agendada y aún no se le haya enviado el recordatorio.
 *
 * Está pensado para dispararse cada minuto (Vercel Cron en plan Pro, Supabase pg_cron,
 * o un pinger externo). Reutiliza el flag appointments.reminder_sent para no duplicar
 * el envío con el cron real de 24h.
 *
 * Para retirarlo tras la demo: borra esta carpeta y su entrada de cron.
 */

// Ventana configurable (minutos)
const DELAY_MIN = parseInt(process.env.DEMO_REMINDER_DELAY_MIN || '2', 10);   // silencio mínimo
const WINDOW_MIN = parseInt(process.env.DEMO_REMINDER_WINDOW_MIN || '20', 10); // máximo, para no disparar sobre datos antiguos

async function handle(req: NextRequest) {
    try {
        // Seguridad: si hay CRON_SECRET configurado, exígelo (Vercel Cron lo envía automáticamente)
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const auth = req.headers.get('authorization');
            const url = new URL(req.url);
            const qs = url.searchParams.get('secret');
            if (auth !== `Bearer ${cronSecret}` && qs !== cronSecret) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const now = new Date();
        console.log(`⏱️  [DEMO] Reminder job (silencio ${DELAY_MIN}-${WINDOW_MIN} min)...`);

        await supabaseAdmin.from('webhook_logs').insert({
            method: 'CRON_DEMO_REMINDERS_START',
            url: '/api/cron/demo-reminders',
            body: { timestamp: now.toISOString(), delay_min: DELAY_MIN, window_min: WINDOW_MIN }
        });

        // 1. Citas futuras, sin recordatorio enviado, en estados activos
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*, clients(id, whatsapp_id, name)')
            .gt('start_time', now.toISOString())
            .in('status', ['scheduled', 'rescheduled', 'confirmed'])
            .eq('reminder_sent', false);

        if (error) {
            await supabaseAdmin.from('webhook_logs').insert({
                method: 'CRON_DEMO_REMINDERS_ERROR',
                error: error.message,
                body: { step: 'FETCHING_APPOINTMENTS' }
            });
            throw error;
        }

        if (!appointments || appointments.length === 0) {
            return NextResponse.json({ message: 'No hay citas candidatas.' });
        }

        const results: any[] = [];
        const logsToInsert: Partial<Message>[] = [];
        const sentApptIds: string[] = [];

        for (const app of appointments) {
            const client = app.clients as any;
            if (!client || !client.whatsapp_id) continue;

            // 2. Último mensaje DEL PACIENTE (role='user') -> "fin de la conversación"
            const { data: lastMsgs } = await supabaseAdmin
                .from('messages')
                .select('created_at')
                .eq('client_id', client.id)
                .eq('role', 'user')
                .order('created_at', { ascending: false })
                .limit(1);

            const lastMsg = lastMsgs?.[0];
            if (!lastMsg) continue; // sin conversación real -> no es candidato de demo

            const idleMin = (now.getTime() - new Date(lastMsg.created_at).getTime()) / 60000;
            if (idleMin < DELAY_MIN || idleMin > WINDOW_MIN) continue; // aún hablando, o demasiado antiguo

            const tenantId = app.tenant_id || app.cliente_id;
            const { data: tenant } = await supabaseAdmin
                .from('tenants')
                .select('ai_config')
                .eq('id', tenantId)
                .single();
            const aiConfig = tenant?.ai_config as any;

            const dt = new Date(app.start_time);
            const dateStr = dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' });
            const timeStr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

            try {
                const vars = { patient_name: client.name || 'Paciente', date: dateStr, time: timeStr };
                const token = aiConfig?.whatsapp_keys?.access_token || aiConfig?.whatsapp_keys?.api_key;
                const creds = {
                    phoneId: aiConfig?.whatsapp_keys?.phone_id,
                    token,
                    templateName: aiConfig?.whatsapp_templates?.confirmation,
                    mapping: aiConfig?.whatsapp_templates?.mapping
                };

                await sendAppointmentConfirmationTemplate(client.whatsapp_id, vars, creds);

                sentApptIds.push(app.id);
                logsToInsert.push({
                    client_id: client.id,
                    role: 'assistant',
                    content: `[RECORDATORIO DEMO · plantilla ${creds.templateName || 'confirmacion_cita'}] ${client.name} — ${dateStr} ${timeStr} (enviado ${idleMin.toFixed(1)} min tras último mensaje)`,
                    created_at: now.toISOString(),
                    cliente_id: tenantId
                });
                results.push({ client: client.name, status: 'sent', id: app.id, idle_min: Number(idleMin.toFixed(1)) });
            } catch (err: any) {
                console.error(`[DEMO] Failed to send for appt ${app.id}:`, err);
                await supabaseAdmin.from('webhook_logs').insert({
                    method: 'CRON_DEMO_REMINDERS_SEND_ERROR',
                    error: err.message,
                    body: { app_id: app.id, client: client.name }
                });
                results.push({ client: client.name, status: 'failed', error: err.message });
            }
        }

        // 3. Marcar como enviados (evita re-envío y choque con el cron de 24h)
        if (sentApptIds.length > 0) {
            await supabaseAdmin.from('appointments').update({ reminder_sent: true }).in('id', sentApptIds);
        }
        if (logsToInsert.length > 0) {
            await supabaseAdmin.from('messages').insert(logsToInsert);
        }

        await supabaseAdmin.from('webhook_logs').insert({
            method: 'CRON_DEMO_REMINDERS_SUCCESS',
            body: { candidates: appointments.length, sent: sentApptIds.length, details: results }
        });

        return NextResponse.json({ success: true, candidates: appointments.length, sent: sentApptIds.length, details: results });
    } catch (e: any) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[DEMO] Reminder Error:', msg);
        try {
            await supabaseAdmin.from('webhook_logs').insert({ method: 'CRON_DEMO_REMINDERS_FATAL_ERROR', error: msg });
        } catch { /* silent */ }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    return handle(req);
}

// Permite también POST (p.ej. desde pg_net / pingers que usen POST)
export async function POST(req: NextRequest) {
    return handle(req);
}
