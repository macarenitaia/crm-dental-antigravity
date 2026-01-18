import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { supabaseAdmin } from '../src/lib/supabase-admin';
import { sendAppointmentConfirmationTemplate } from '../src/lib/whatsapp-service';

async function triggerTestReminder() {
    const PHONE = '34606523222';

    // Fetch Appointment and Client
    const { data: app, error } = await supabaseAdmin
        .from('appointments')
        .select('*, clients(*)')
        .eq('status', 'scheduled')
        .eq('clients.whatsapp_id', PHONE)
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

    if (error || !app) {
        console.error('No suitable appointment found for test.', error);
        return;
    }

    const client = app.clients as any;
    const tenantId = app.cliente_id;

    // Fetch Tenant Config
    const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('ai_config')
        .eq('id', tenantId)
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

        console.log(`[TEST] Sending Template to ${PHONE}...`);
        await sendAppointmentConfirmationTemplate(PHONE, vars, creds);
        console.log(`[TEST] Success! Check your WhatsApp.`);
    } catch (err: any) {
        console.error('[TEST] Failed:', err.message);
    }
}

triggerTestReminder();
