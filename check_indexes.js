require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkIndexes() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        console.log('--- Indexes for users table ---');
        const res = await client.query(`
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'users'
        `);

        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error checking indexes:', err);
    } finally {
        await client.end();
    }
}

checkIndexes();
