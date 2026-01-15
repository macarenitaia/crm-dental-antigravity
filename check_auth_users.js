require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAuthUsers() {
    console.log('=== CHECKING AUTH USERS ===\n');

    // List all users in Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Total auth users: ${users.length}\n`);

    users.forEach(u => {
        console.log(`📧 ${u.email}`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Email Confirmed: ${u.email_confirmed_at ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${u.created_at}`);
        console.log(`   Last Sign In: ${u.last_sign_in_at || 'Never'}`);
        console.log('');
    });

    // Also test login for each known user
    console.log('\n=== TESTING LOGIN CREDENTIALS ===\n');

    const testCreds = [
        { email: 'demo@clinica.com', password: 'demo1234' },
        { email: 'admin@clinicagarcia.com', password: 'Garcia2024' },
        { email: 'admin@odontologiconorte.com', password: 'Norte2024' },
        { email: 'admin@sonrisaperfecta.com', password: 'Sonrisa2024' }
    ];

    for (const cred of testCreds) {
        // Use the anon client to test actual login
        const anonClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data, error } = await anonClient.auth.signInWithPassword({
            email: cred.email,
            password: cred.password
        });

        if (error) {
            console.log(`❌ ${cred.email}: ${error.message}`);
        } else {
            console.log(`✅ ${cred.email}: Login successful!`);
        }
    }
}

checkAuthUsers();
