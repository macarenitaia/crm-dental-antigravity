const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function disableAllRLS() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        for (const row of res.rows) {
            console.log(`Disabling RLS on ${row.tablename}...`);
            await client.query(`ALTER TABLE "${row.tablename}" DISABLE ROW LEVEL SECURITY`);
        }
        console.log('✅ RLS Disabled on ALL tables');
    } catch (err) {
        console.error('❌ Error disabling RLS:', err.message);
    } finally {
        await client.end();
    }
}

disableAllRLS();
