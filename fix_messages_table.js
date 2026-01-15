
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    console.log("Connecting to database...");

    // Check if OPENAI_API_KEY is accidentally in DATABASE_URL? No, separate vars.
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL not found.");
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Check if table exists and what columns it has (optional, but good for logs)
        // We will just force Drop and Create to be 100% sure.
        console.log("Dropping and Recreating messages table...");

        const query = `
            DROP TABLE IF EXISTS messages;
            
            CREATE TABLE messages (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Enable RLS if needed, but let's keep it open for anon/service_role for now or basic authenticated
            ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
            
            -- Policy: Allow all access for now (simplifies debugging, tighten later if asked)
            CREATE POLICY "Allow all access" ON messages FOR ALL USING (true) WITH CHECK (true);
        `;

        await client.query(query);
        console.log("✅ Messages table recreated successfully.");

    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        await client.end();
    }
}

runMigration();
