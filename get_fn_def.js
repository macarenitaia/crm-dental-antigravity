require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

async function getFunction() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        const res = await client.query(`
            SELECT pg_get_functiondef(oid) as def
            FROM pg_proc 
            WHERE proname = 'is_super_admin'
        `);

        if (res.rows.length > 0) {
            fs.writeFileSync('fn_def.txt', res.rows[0].def);
            console.log('Function definition saved to fn_def.txt');
        } else {
            console.log('Function is_super_admin not found');
        }

    } catch (err) {
        console.error('Error getting function:', err);
    } finally {
        await client.end();
    }
}

getFunction();
