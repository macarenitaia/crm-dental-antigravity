
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TARGET_TENANT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; // HQ Macarenita IA
const WHATSAPP_ID = '34606523222'; // Luis's WhatsApp

async function migrate() {
    console.log('Migrating client and messages to HQ Macarenita IA...');

    // 1. Find the client
    const { data: clients, error: fetchErr } = await supabase
        .from('clients')
        .select('id, cliente_id')
        .eq('whatsapp_id', WHATSAPP_ID);

    if (fetchErr) {
        console.error('Error fetching clients:', fetchErr);
        return;
    }

    if (!clients || clients.length === 0) {
        console.log('No clients found with whatsapp_id:', WHATSAPP_ID);
        return;
    }

    const clientId = clients[0].id;
    console.log('Found client:', clientId, 'Current tenant:', clients[0].cliente_id);

    // 2. Update client's tenant
    const { error: updateClientErr } = await supabase
        .from('clients')
        .update({ cliente_id: TARGET_TENANT_ID })
        .eq('id', clientId);

    if (updateClientErr) {
        console.error('Error updating client:', updateClientErr);
    } else {
        console.log('Client updated to tenant:', TARGET_TENANT_ID);
    }

    // 3. Update messages for this client
    const { error: updateMsgErr } = await supabase
        .from('messages')
        .update({ cliente_id: TARGET_TENANT_ID })
        .eq('client_id', clientId);

    if (updateMsgErr) {
        console.error('Error updating messages:', updateMsgErr);
    } else {
        console.log('Messages updated to tenant:', TARGET_TENANT_ID);
    }

    console.log('Migration complete!');
}

migrate();
