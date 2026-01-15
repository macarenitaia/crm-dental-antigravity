require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS and create auth user
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function seedDemoUser() {
    const demoEmail = 'demo@clinica.com';
    const demoPassword = 'demo1234';
    const demoTenantId = '00000000-0000-0000-0000-000000000000';

    console.log('=== Seeding Demo User ===\n');

    // 1. Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === demoEmail);

    let authUserId;

    if (existingUser) {
        console.log(`✅ Auth user already exists: ${existingUser.id}`);
        authUserId = existingUser.id;
    } else {
        // Create auth user
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
            email: demoEmail,
            password: demoPassword,
            email_confirm: true // Auto-confirm email
        });

        if (authError) {
            console.error('❌ Error creating auth user:', authError.message);
            return;
        }

        console.log(`✅ Created auth user: ${newUser.user.id}`);
        authUserId = newUser.user.id;
    }

    // 2. Check if user record exists in our users table
    const { data: existingUserRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUserId)
        .single();

    if (existingUserRecord) {
        console.log(`✅ User record already exists in users table`);
    } else {
        // Create user record linked to demo tenant
        const { data: newUserRecord, error: userError } = await supabase
            .from('users')
            .insert({
                auth_user_id: authUserId,
                tenant_id: demoTenantId,
                email: demoEmail,
                name: 'Usuario Demo',
                role: 'admin'
            })
            .select()
            .single();

        if (userError) {
            console.error('❌ Error creating user record:', userError.message);
            return;
        }

        console.log(`✅ Created user record in users table`);
    }

    console.log('\n=== Demo User Ready ===');
    console.log(`Email: ${demoEmail}`);
    console.log(`Password: ${demoPassword}`);
    console.log(`Tenant: Demo Clinic (${demoTenantId})`);
}

seedDemoUser();
