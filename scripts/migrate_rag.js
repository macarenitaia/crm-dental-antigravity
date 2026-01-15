
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
    console.log('🔌 Connecting to database for RAG Migration...');
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const file = 'rag_schema.sql';
        const filePath = path.join(process.cwd(), file);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`📄 Executing ${file}...`);
        await client.query(sql);
        console.log(`✅ Schema applied successfully.`);

    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await client.end();
    }
}

run();
