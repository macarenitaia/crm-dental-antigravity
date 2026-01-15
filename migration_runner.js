const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    const sqlFile = process.argv[2];

    if (!sqlFile) {
        console.error("❌ Error: Please provide a SQL file path as an argument.");
        process.exit(1);
    }

    if (!fs.existsSync(sqlFile)) {
        console.error(`❌ Error: SQL file not found at '${sqlFile}'`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`📄 Loaded SQL file: ${sqlFile}`);

    console.log("Connecting to database...");
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL not found in environment.");
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected. Executing migration...");
        await client.query(sql);
        console.log("✅ Migration successful!");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        await client.end();
    }
}

runMigration();
