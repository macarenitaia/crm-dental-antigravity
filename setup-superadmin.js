const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUPERADMIN_EMAIL = 'macarenita.ia@gmail.com';

async function setup() {
    console.log(`Setting up test environment for ${SUPERADMIN_EMAIL}...`);

    // 1. Get or Create Tenant for SuperAdmin
    let { data: user, error: userError } = await supabase
        .from('users')
        .select('tenant_id, name')
        .eq('email', SUPERADMIN_EMAIL)
        .single();

    if (userError) {
        console.log('User not found, skipping setup. Please ensure the user is registered.');
        return;
    }

    let tenantId = user.tenant_id;

    if (!tenantId) {
        console.log('User has no tenant. Creating one...');
        const { data: newTenant, error: tError } = await supabase
            .from('tenants')
            .insert({
                nombre: 'Clínica SuperAdmin (Pruebas)',
                email: SUPERADMIN_EMAIL,
                plan: 'pro',
                active: true
            })
            .select()
            .single();

        if (tError) throw tError;
        tenantId = newTenant.id;

        // Link user to tenant
        await supabase.from('users').update({ tenant_id: tenantId }).eq('email', SUPERADMIN_EMAIL);
    }

    // 2. Ensure Clinic exists
    const { data: clinic, error: cError } = await supabase
        .from('clinics')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

    if (!clinic || clinic.length === 0) {
        console.log('No clinic found. Creating one...');
        const { error: insError } = await supabase
            .from('clinics')
            .insert({
                name: 'Sede Central Superadmin',
                address: 'Calle Ficticia 123, Madrid',
                tenant_id: tenantId,
                cliente_id: tenantId
            });
        if (insError) throw insError;
    }

    // 3. Insert WhatsApp Settings (using the keys from your .env)
    console.log('Updating WhatsApp settings for Superadmin...');
    await supabase
        .from('whatsapp_settings')
        .upsert({
            tenant_id: tenantId,
            phone_number_id: process.env.WHATSAPP_PHONE_ID,
            access_token: process.env.WHATSAPP_ACCESS_TOKEN,
            template_name: 'confirmacion_cita',
            template_mapping: { "header": ["{patient_name}"], "body": ["{date}", "{time}"] }
        }, { onConflict: 'tenant_id' });

    console.log('Setup complete!');
    console.log(`Tenant ID: ${tenantId}`);
}

setup().catch(console.error);
