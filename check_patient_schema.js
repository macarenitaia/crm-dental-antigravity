require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('TABLES:', res.rows.map(r => r.table_name).join(', '));

        // Also check columns for clients and clinical_history
        const tablesToCheck = ['clients', 'patients', 'clinical_history'];
        for (const table of tablesToCheck) {
            const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            if (cols.rows.length > 0) {
                console.log(`COLUMNS for ${table}:`, cols.rows.map(r => r.column_name).join(', '));
            } else {
                console.log(`TABLE ${table} DOES NOT EXIST`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
