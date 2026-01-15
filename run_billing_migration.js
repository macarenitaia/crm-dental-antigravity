/**
 * Run billing migration via Supabase
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
    console.log('🔧 Running Billing Migration...\n');

    const sql = fs.readFileSync('migration_billing.sql', 'utf8');

    // Split into individual statements
    const statements = sql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let errors = 0;

    for (const stmt of statements) {
        if (stmt.length < 10) continue;

        const preview = stmt.slice(0, 60).replace(/\n/g, ' ');

        try {
            // Use from().rpc or direct query workaround
            // For DDL, we need to use the SQL editor or a workaround

            // Try to detect table creation
            if (stmt.toUpperCase().includes('CREATE TABLE')) {
                const match = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
                const tableName = match ? match[1] : 'unknown';

                // Check if table exists
                const { error } = await supabase.from(tableName).select('id').limit(1);
                if (!error) {
                    console.log(`✓ Table ${tableName} already exists`);
                    success++;
                    continue;
                }
            }

            // For other statements, we'll note them
            console.log(`⚠ Manual: ${preview}...`);

        } catch (e) {
            console.log(`❌ Error: ${preview}...`);
            errors++;
        }
    }

    console.log(`\n📋 Summary: Many DDL statements require manual execution in Supabase SQL Editor.`);
    console.log(`   Copy migration_billing.sql to Supabase Dashboard > SQL Editor > Run\n`);

    // Test if tables exist
    console.log('🧪 Testing table access...');
    const tables = ['invoices', 'invoice_items', 'payments', 'notifications_log'];

    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
            console.log(`  ❌ ${table}: Not created yet`);
        } else if (error) {
            console.log(`  ⚠ ${table}: ${error.message}`);
        } else {
            console.log(`  ✅ ${table}: Ready`);
        }
    }
}

runMigration().catch(console.error);
