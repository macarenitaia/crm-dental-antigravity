require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Users for each tenant
const usersToCreate = [
    {
        email: 'admin@clinicagarcia.com',
        password: 'Garcia2024',
        name: 'Admin García',
        tenant_id: '11111111-1111-1111-1111-111111111111',
        role: 'admin'
    },
    {
        email: 'admin@odontologiconorte.com',
        password: 'Norte2024',
        name: 'Admin Norte',
        tenant_id: '22222222-2222-2222-2222-222222222222',
        role: 'admin'
    },
    {
        email: 'admin@sonrisaperfecta.com',
        password: 'Sonrisa2024',
        name: 'Admin Sonrisa',
        tenant_id: '33333333-3333-3333-3333-333333333333',
        role: 'admin'
    }
];

async function createTenantUsers() {
    console.log('=== CREATING USERS FOR EACH TENANT ===\n');

    for (const user of usersToCreate) {
        console.log(`\n👤 Creating user: ${user.email}`);

        // 1. Check if auth user exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAuth = existingUsers?.users?.find(u => u.email === user.email);

        let authUserId;

        if (existingAuth) {
            console.log(`   ⚠️  Auth user already exists: ${existingAuth.id}`);
            authUserId = existingAuth.id;
        } else {
            // Create auth user
            const { data: newAuth, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true
            });

            if (authError) {
                console.error(`   ❌ Auth error: ${authError.message}`);
                continue;
            }
            console.log(`   ✅ Created auth user: ${newAuth.user.id}`);
            authUserId = newAuth.user.id;
        }

        // 2. Check if user record exists in users table
        const { data: existingUserRecord } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', authUserId)
            .single();

        if (existingUserRecord) {
            console.log(`   ⚠️  User record already exists in users table`);
        } else {
            // Create user record
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    auth_user_id: authUserId,
                    tenant_id: user.tenant_id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                });

            if (userError) {
                console.error(`   ❌ User record error: ${userError.message}`);
                continue;
            }
            console.log(`   ✅ Created user record linked to tenant`);
        }
    }

    // Verification
    console.log('\n\n=== USERS TABLE CONTENTS ===\n');
    const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, name, role, tenant_id, tenants(nombre)')
        .order('created_at');

    allUsers?.forEach(u => {
        const tenantName = u.tenants?.nombre || 'Unknown';
        console.log(`👤 ${u.email}`);
        console.log(`   Name: ${u.name}`);
        console.log(`   Role: ${u.role}`);
        console.log(`   Tenant: ${tenantName} (${u.tenant_id})\n`);
    });

    console.log(`\n✅ Total users: ${allUsers?.length || 0}`);
}

createTenantUsers();
