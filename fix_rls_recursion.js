require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();

        // Fix is_super_admin to be non-recursive if it was querying users table
        // We can check the role directly from the JWT if we store it there, 
        // but since we query the users table, we need to bypass RLS or use a different table.
        // Actually, for Super Admin, we can check the email directly from the JWT for a safe bypass.

        const sql = `
            CREATE OR REPLACE FUNCTION is_super_admin()
            RETURNS boolean AS $$
            BEGIN
              -- Safe check: check if user exists in users table with super_admin role 
              -- but use SECURITY DEFINER to bypass RLS of the table being queried.
              -- Or better: just check the email from auth.jwt() for the primary superadmin
              RETURN (
                (auth.jwt() ->> 'email'::text) = 'macarenita.ia@gmail.com'
                OR
                EXISTS (
                  SELECT 1 FROM users 
                  WHERE auth_user_id = auth.uid() 
                  AND role = 'super_admin'
                )
              );
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;

        // SECURITY DEFINER is key here to avoid recursion.

        await client.query(sql);
        console.log('Function is_super_admin updated with SECURITY DEFINER.');

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
