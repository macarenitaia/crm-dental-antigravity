
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clients';
        `);

        console.log("Existing Columns in 'clients':");
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
