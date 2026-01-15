require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, column_default, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'tratamientos_new' AND column_name = 'id'");
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
