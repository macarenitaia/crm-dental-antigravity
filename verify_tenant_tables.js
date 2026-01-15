require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyTenantTables() {
    console.log("--- Verifying Tenant Tables ---");

    // 1. Check Doctores
    const { data: doctores, error: docErr } = await supabase.from('doctores').select('*').limit(3);
    if (docErr) {
        console.error("❌ 'doctores' table error:", docErr.message);
    } else {
        console.log("✅ 'doctores' table exists. Rows:", doctores.length);
        if (doctores.length > 0) console.log("   Sample:", doctores[0]);
    }

    // 2. Check Tratamientos
    const { data: tratamientos, error: tratErr } = await supabase.from('tratamientos').select('*').limit(3);
    if (tratErr) {
        console.error("❌ 'tratamientos' table error:", tratErr.message);
    } else {
        console.log("✅ 'tratamientos' table exists. Rows:", tratamientos.length);
        if (tratamientos.length > 0) console.log("   Sample:", tratamientos[0]);
    }

    // 3. Check clients columns
    const { data: clients, error: clientErr } = await supabase.from('clients').select('*').limit(1);
    if (clients && clients.length > 0) {
        console.log("✅ 'clients' columns:", Object.keys(clients[0]));
    }
}

verifyTenantTables();
