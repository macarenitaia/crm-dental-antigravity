require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();

        const tables = ['doctors', 'doctores', 'clinics', 'doctor_clinics'];
        for (const t of tables) {
            const hasTable = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${t}')`);
            if (hasTable.rows[0].exists) {
                const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}'`);
                console.log(`TABLE: ${t}`);
                console.log(`COLS: ${cols.rows.map(r => r.column_name).join(', ')}`);
            } else {
                console.log(`TABLE: ${t} (DOES NOT EXIST)`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
