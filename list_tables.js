require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('--- ALL TABLES ---');
        console.log(tablesRes.rows.map(r => r.table_name).join(', '));

        const tablesToCheck = ['doctors', 'doctores', 'clinics', 'doctor_clinics'];
        for (const table of tablesToCheck) {
            const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(`--- ${table} ---`);
            console.log(colsRes.rows.map(r => r.column_name).join(', '));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
