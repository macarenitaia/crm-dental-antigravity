require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const tables = ['tenants', 'users'];
        for (const t of tables) {
            const res = await client.query(`SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = '${t}'`);
            console.log(`--- Policies for ${t} ---`);
            console.table(res.rows);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
