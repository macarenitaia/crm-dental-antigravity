const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function init() {
    console.log('--- SuperAdmin Init ---');
    const email = 'macarenita.ia@gmail.com';
    const password = 'Ñu1s3t31133';

    try {
        console.log(`Creating user: ${email}...`);
        const { data, error } = await s.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('User already exists, updating password...');
                const { data: listData } = await s.auth.admin.listUsers();
                const existing = listData.users.find(u => u.email === email);
                if (existing) {
                    await s.auth.admin.updateUserById(existing.id, { password });
                    console.log('Password updated.');
                }
            } else {
                console.error('Auth Error:', error.message);
            }
        } else {
            console.log('User created successfully:', data.user.id);
        }

        // Ensure user exists in users table
        const { data: existingUser } = await s.from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (!existingUser) {
            console.log('Inserting into users table...');
            const { error: insError } = await s.from('users').insert({
                email,
                name: 'Super Admin',
                role: 'admin',
                tenant_id: '00000000-0000-0000-0000-000000000000'
            });
            if (insError) console.error('Insert Error:', insError.message);
            else console.log('User record created in users table.');
        } else {
            console.log('User record already exists in users table.');
        }

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

init();
