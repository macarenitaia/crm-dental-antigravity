require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tratamientos_new'");
        const cols = res.rows.map(r => r.column_name).join(',');
        console.log(cols);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
