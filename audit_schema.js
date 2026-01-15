require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const tables = ['clients', 'clinical_history', 'patient_treatments'];
        for (const table of tables) {
            const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            const cols = res.rows.map(r => r.column_name).sort();
            console.log(`--- ${table} ---`);
            cols.forEach(c => console.log(c));
            console.log('');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
