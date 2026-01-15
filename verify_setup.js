require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifySetup() {
    console.log('=== VERIFYING MULTI-TENANT SETUP ===\n');

    // 1. Check tenants
    console.log('📦 TENANTS:');
    const { data: tenants } = await supabase.from('tenants').select('id, nombre, email');
    tenants?.forEach(t => console.log(`  • ${t.nombre} (${t.email})`));

    // 2. Check users
    console.log('\n👤 USERS:');
    const { data: users } = await supabase.from('users').select('email, name, tenant_id, auth_user_id');
    users?.forEach(u => console.log(`  • ${u.email} → tenant: ${u.tenant_id?.slice(0, 4)}... auth: ${u.auth_user_id?.slice(0, 8)}...`));

    // 3. Check auth users
    console.log('\n🔐 AUTH USERS:');
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    authUsers?.forEach(u => console.log(`  • ${u.email} - confirmed: ${u.email_confirmed_at ? '✅' : '❌'}`));

    // 4. Test login for each tenant
    console.log('\n🧪 LOGIN TESTS:');
    const testEmails = [
        'madrid@clinica.com',
        'barcelona@smile.com',
        'valencia@dental.com',
        'sevilla@dental.com'
    ];

    const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    for (const email of testEmails) {
        const { data, error } = await anonClient.auth.signInWithPassword({
            email,
            password: 'Demo2024!'
        });

        if (error) {
            console.log(`  ❌ ${email}: ${error.message}`);
        } else {
            console.log(`  ✅ ${email}: OK`);
        }
    }

    // 5. Check data per tenant
    console.log('\n📊 DATA PER TENANT:');
    for (const t of tenants || []) {
        const { count: clinics } = await supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('cliente_id', t.id);
        const { count: clients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('cliente_id', t.id);
        const { count: appts } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('cliente_id', t.id);
        const { count: msgs } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('cliente_id', t.id);

        console.log(`  ${t.nombre}:`);
        console.log(`    Clinics: ${clinics}, Patients: ${clients}, Appointments: ${appts}, Messages: ${msgs}`);
    }

    console.log('\n✅ Verification complete!');
}

verifySetup().catch(console.error);
