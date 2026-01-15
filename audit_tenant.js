require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function auditTenantCompliance() {
    console.log("=== MULTI-TENANT AUDIT ===\n");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL not found");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Get all tables in public schema
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const tables = tablesResult.rows.map(r => r.table_name);
        console.log(`Found ${tables.length} tables in 'public' schema:\n`);

        const compliant = [];
        const nonCompliant = [];

        for (const table of tables) {
            // Get columns for this table
            const columnsResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position;
            `, [table]);

            const columns = columnsResult.rows;
            const hasClienteId = columns.some(c => c.column_name === 'cliente_id');
            const columnNames = columns.map(c => c.column_name).join(', ');

            if (hasClienteId) {
                compliant.push(table);
                console.log(`✅ ${table}`);
                console.log(`   Columns: ${columnNames}\n`);
            } else {
                nonCompliant.push(table);
                console.log(`❌ ${table} (MISSING cliente_id)`);
                console.log(`   Columns: ${columnNames}\n`);
            }
        }

        console.log("\n=== SUMMARY ===");
        console.log(`✅ Compliant: ${compliant.length} tables`);
        console.log(`❌ Non-Compliant: ${nonCompliant.length} tables`);

        if (nonCompliant.length > 0) {
            console.log("\nTables needing cliente_id:");
            nonCompliant.forEach(t => console.log(`  - ${t}`));
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

auditTenantCompliance();
