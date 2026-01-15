require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

async function checkRLS() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        let output = '--- RLS Policies for users table ---\n';
        const res = await client.query(`
            SELECT 
                policyname, 
                permissive, 
                roles, 
                cmd, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE tablename = 'users'
        `);

        output += JSON.stringify(res.rows, null, 2) + '\n';

        output += '\n--- RLS Status for users table ---\n';
        const statusRes = await client.query(`
            SELECT relname, relrowsecurity, relforcerowsecurity 
            FROM pg_class 
            JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
            WHERE relname = 'users' AND nspname = 'public'
        `);
        output += JSON.stringify(statusRes.rows, null, 2) + '\n';

        fs.writeFileSync('rls_audit.txt', output);
        console.log('Audit saved to rls_audit.txt');

    } catch (err) {
        console.error('Error checking RLS:', err);
    } finally {
        await client.end();
    }
}

checkRLS();
