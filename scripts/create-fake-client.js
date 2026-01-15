
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createFakeClient() {
    console.log("Creating Rich Fake Client...");

    // 1. Create Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
            name: 'María López',
            whatsapp_id: '34600000000',
            status: 'client',
            psychological_profile: 'Madre de familia, muy preocupada por la estética pero con miedo al dolor. Necesita mucha reafirmación y explicaciones detalladas. Presupuesto medio-alto.'
        })
        .select()
        .single();

    if (clientError) {
        console.error('Error creating client:', clientError);
        return;
    }

    const clientId = client.id;
    console.log(`Client Created: ${client.name} (${clientId})`);

    // 2. Create History (Past Appointments)
    await supabase.from('appointments').insert([
        {
            client_id: clientId,
            start_time: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
            end_time: new Date(Date.now() - 86400000 * 7 + 1800000).toISOString(),
            status: 'completed'
        },
        {
            client_id: clientId,
            start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            end_time: new Date(Date.now() + 86400000 + 1800000).toISOString(),
            status: 'scheduled'
        }
    ]);
    console.log('Appointments added.');

    // 3. Create Chat Logs
    await supabase.from('messages').insert([
        { client_id: clientId, role: 'user', content: '¿Tenéis hueco para una limpieza?' },
        { client_id: clientId, role: 'assistant', content: '¡Hola María! ✨ Sí, claro. ¿Te viene bien este jueves a las 17:00?' },
        { client_id: clientId, role: 'user', content: 'Me da un poco de miedo, ¿duele mucho?' },
        { client_id: clientId, role: 'assistant', content: 'No te preocupes ❤️. Usamos un gel especial y vamos con mucho cuidado. ¡Ni lo notarás! ¿Te reservo el hueco?' },
        { client_id: clientId, role: 'user', content: 'Vale, venga.' }
    ]);
    console.log('Chat logs added.');

    console.log("✅ DUMMY DATA READY! Refresh your app.");
}

createFakeClient();
