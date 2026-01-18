
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../import.env') });

const { createClient } = require('@supabase/supabase-js');

async function sendManualTemplate(to, vars, creds) {
    const { phoneId, token, templateName } = creds;
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

    const components = [
        {
            type: 'header',
            parameters: [{ type: 'text', text: vars.patient_name }]
        },
        {
            type: 'body',
            parameters: [
                { type: 'text', text: vars.date },
                { type: 'text', text: vars.time }
            ]
        }
    ];

    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'es_ES' },
            components: components
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
}

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const PHONE = '34606523222';

    const { data: app, error: appError } = await supabase
        .from('appointments')
        .select('*, clients!inner(*)') // Use !inner to ensure join works correctly
        .eq('status', 'scheduled')
        .eq('clients.whatsapp_id', PHONE)
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

    if (appError || !app) {
        console.log('No app found for phone ' + PHONE, appError?.message);
        return;
    }

    const client = app.clients;
    if (!client) {
        console.error('Client object is null in app response:', app);
        return;
    }

    const { data: tenant } = await supabase
        .from('tenants')
        .select('ai_config')
        .eq('id', app.cliente_id)
        .single();

    const aiConfig = tenant.ai_config;
    const appDate = new Date(app.start_time);

    const date = appDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' });
    const time = appDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });

    const vars = { patient_name: client.name, date, time };
    const creds = {
        phoneId: aiConfig.whatsapp_keys.phone_id,
        token: aiConfig.whatsapp_keys.api_key,
        templateName: aiConfig.whatsapp_templates.confirmation
    };

    console.log(`Sending reminder to ${client.name} (${PHONE}) for ${date} at ${time}...`);
    const res = await sendManualTemplate(PHONE, vars, creds);
    console.log('Success!', res);
}

run().catch(console.error);
