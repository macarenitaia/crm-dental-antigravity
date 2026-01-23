
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log("--- DEBUGGING RECENT CONVERSATIONS ---");

    // 1. Get recent clients
    console.log("\n1. Recent Clients (Last 10):");
    const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('id', { ascending: false }) // Fallback since updated_at failed
        .limit(10);

    if (clientsError) console.error("Error fetching clients:", clientsError);
    else {
        clients.forEach(c => {
            console.log(`- ID: ${c.id} | Name: ${c.name} | WhatsApp: ${c.whatsapp_id} | Tenant: ${c.cliente_id} | Created: ${c.created_at}`);
        });
    }

    // 1b. Check for specific client
    console.log("\n1b. Checking for client 34610620524:");
    const { data: specificClient } = await supabase
        .from('clients')
        .select('*')
        .eq('whatsapp_id', '34610620524')
        .single();
    if (specificClient) {
        console.log(`- Found: ID=${specificClient.id}, Tenant=${specificClient.cliente_id}`);
        // Check messages for this client
        const { data: specificMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('client_id', specificClient.id)
            .order('created_at', { ascending: false })
            .limit(5);
        specificMessages?.forEach(m => console.log(`  > [${m.created_at}] [Tenant: ${m.cliente_id}] ${m.role}: ${m.content}`));
    } else {
        console.log("- Client 34610620524 NOT found in clients table.");
    }

    // 2. Get recent messages
    console.log("\n2. Recent Messages (Last 10):");
    const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, client_id, role, content, cliente_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (messagesError) console.error("Error fetching messages:", messagesError);
    else {
        messages.forEach(m => {
            console.log(`- [${m.created_at}] [Client: ${m.client_id}] [Tenant: ${m.cliente_id}] [${m.role}]: ${m.content.substring(0, 50)}...`);
        });
    }

    // 3. Check for any clients with DEFAULT_TENANT_ID
    const DEFAULT_TENANT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    console.log(`\n3. Checking for clients with Tenant ID: ${DEFAULT_TENANT_ID}`);
    const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('cliente_id', DEFAULT_TENANT_ID);

    if (countError) console.error("Error counting default tenant clients:", countError);
    else console.log(`- Found ${count} clients in default tenant.`);

    // 4. Recent Webhook Logs
    console.log("\n4. Recent AGENT_STEP Webhook Logs:");
    const { data: logs, error: logsError } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('method', 'AGENT_STEP')
        .order('created_at', { ascending: false })
        .limit(5);

    if (logsError) console.error("Error fetching webhook logs:", logsError);
    else {
        logs.forEach(l => {
            console.log(`- [${l.created_at}] [Step: ${l.url}] [User: ${l.query_params?.userId}] [Tenant: ${l.query_params?.effectiveTenantId}]`);
        });
    }
}

debug();
