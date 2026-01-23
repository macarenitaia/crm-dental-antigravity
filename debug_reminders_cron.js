
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mocking the template send function to just log
async function mockSendTemplate(to, vars, creds) {
    console.log(`[MOCK] Sending template to ${to}`);
    console.log(`[MOCK] Vars:`, vars);
    console.log(`[MOCK] Creds:`, { ...creds, token: creds.token ? 'PRESENT' : 'MISSING' });

    if (!creds.phoneId || !creds.token) {
        throw new Error('Missing WhatsApp Credentials');
    }

    // In a real test, we might want to actually send if we are brave, 
    // but let's just simulate for now to check if the logic reaches here.
    return { success: true };
}

async function debugReminders() {
    console.log("--- DEBUGGING REMINDERS CRON ---");

    const now = new Date();
    // Use the same window as the route.ts
    const startWindow = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString();
    const endWindow = new Date(now.getTime() + 28 * 60 * 60 * 1000).toISOString();

    console.log(`Window: ${startWindow} to ${endWindow}`);

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*, clients(id, whatsapp_id, name)')
        .gte('start_time', startWindow)
        .lte('start_time', endWindow)
        .in('status', ['scheduled', 'rescheduled', 'confirmed'])
        .eq('reminder_sent', false);

    if (error) {
        console.error("Error fetching appointments:", error);
        return;
    }

    console.log(`Found ${appointments.length} appointments.`);

    for (const app of appointments) {
        console.log(`\nProcessing App ID: ${app.id} | Client: ${app.clients?.name} (${app.clients?.whatsapp_id})`);

        const tenantId = app.tenant_id || app.cliente_id;
        console.log(`Tenant ID: ${tenantId}`);

        const { data: tenant, error: tErr } = await supabase
            .from('tenants')
            .select('ai_config')
            .eq('id', tenantId)
            .single();

        if (tErr) {
            console.error(`Error fetching tenant ${tenantId}:`, tErr);
            continue;
        }

        const aiConfig = tenant?.ai_config;
        console.log(`AI Config Keys:`, Object.keys(aiConfig || {}));

        const creds = {
            phoneId: aiConfig?.whatsapp_keys?.phone_id,
            token: aiConfig?.whatsapp_keys?.access_token || aiConfig?.whatsapp_keys?.api_key, // Re-checking what's used
            templateName: aiConfig?.whatsapp_templates?.confirmation,
            mapping: aiConfig?.whatsapp_templates?.mapping
        };

        console.log(`Resolved Creds:`, {
            phoneId: creds.phoneId,
            token: creds.token ? 'PRESENT' : 'MISSING',
            templateName: creds.templateName
        });

        if (!creds.phoneId || !creds.token) {
            console.log("❌ CRITICAL: Missing credentials or token fallback failed.");
        } else {
            console.log("✅ Credentials OK.");
        }
    }
}

debugReminders();
