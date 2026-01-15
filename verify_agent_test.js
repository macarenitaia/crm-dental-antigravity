/**
 * Verificar resultados del test del agente
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_TENANT = 'dddd4444-4444-4444-4444-444444444444';

async function verifyAgentResults() {
    console.log('\n📊 RESULTADOS DEL TEST DEL AGENTE\n');

    // 1. Clientes creados por el agente (leads)
    console.log('=== LEADS CREADOS (Test Users) ===');
    const { data: leads } = await supabase
        .from('clients')
        .select('id, name, whatsapp_id, status, cliente_id')
        .like('whatsapp_id', '+34699%')
        .eq('cliente_id', TEST_TENANT);

    leads?.forEach(l => {
        console.log(`  • ${l.name} (${l.whatsapp_id}) - Status: ${l.status}`);
    });
    console.log(`  Total: ${leads?.length || 0} leads\n`);

    // 2. Citas creadas
    console.log('=== CITAS AGENDADAS ===');
    const { data: appts } = await supabase
        .from('appointments')
        .select(`
            id, 
            start_time, 
            end_time, 
            status,
            clients(name, whatsapp_id),
            clinics(name)
        `)
        .eq('cliente_id', TEST_TENANT)
        .order('start_time', { ascending: true });

    appts?.forEach(a => {
        const client = a.clients;
        const clinic = a.clinics;
        const startMadrid = new Date(a.start_time).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        console.log(`  📅 ${startMadrid}`);
        console.log(`     Cliente: ${client?.name || 'N/A'}`);
        console.log(`     Sede: ${clinic?.name || 'N/A'}`);
        console.log(`     Estado: ${a.status}\n`);
    });
    console.log(`  Total: ${appts?.length || 0} citas\n`);

    // 3. Mensajes (conversaciones)
    console.log('=== CONVERSACIONES ===');
    const { data: msgCounts } = await supabase
        .from('messages')
        .select('client_id, role')
        .eq('cliente_id', TEST_TENANT);

    const byClient = {};
    msgCounts?.forEach(m => {
        byClient[m.client_id] = (byClient[m.client_id] || 0) + 1;
    });

    console.log(`  Total mensajes: ${msgCounts?.length || 0}`);
    console.log(`  Conversaciones únicas: ${Object.keys(byClient).length}\n`);

    // 4. Sample conversation
    console.log('=== EJEMPLO DE CONVERSACIÓN ===');
    if (leads && leads.length > 0) {
        const { data: msgs } = await supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('client_id', leads[0].id)
            .order('created_at', { ascending: true })
            .limit(6);

        msgs?.forEach(m => {
            const icon = m.role === 'user' ? '👤' : '🤖';
            const preview = m.content?.slice(0, 80) + (m.content?.length > 80 ? '...' : '');
            console.log(`  ${icon} ${preview}`);
        });
    }

    console.log('\n✅ Verificación completada\n');
}

verifyAgentResults().catch(console.error);
