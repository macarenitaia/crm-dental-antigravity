require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
    console.log('=== INSPECTING DATABASE SCHEMA ===\n');

    const tables = ['tenants', 'users', 'clinics', 'clients', 'appointments', 'messages', 'tratamientos_new', 'invoices', 'invoice_items'];

    for (const table of tables) {
        console.log(`\n📋 TABLE: ${table}`);
        console.log('─'.repeat(40));

        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            columns.forEach(col => {
                const value = data[0][col];
                const type = typeof value;
                console.log(`   • ${col}: ${type} (example: ${JSON.stringify(value).slice(0, 50)})`);
            });
        } else {
            // Try to insert dummy to see schema error
            const { error: insertError } = await supabase.from(table).insert({}).select();
            if (insertError && insertError.message.includes('column')) {
                console.log(`   Info from error: ${insertError.message}`);
            } else {
                console.log('   (empty table)');
            }
        }
    }
}

inspectSchema().catch(console.error);
