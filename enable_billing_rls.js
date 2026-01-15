/**
 * Enable RLS on billing tables via Supabase Management API
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function enableRLS() {
    console.log('🔒 Enabling RLS on billing tables...\n');

    // Check if tables exist first
    const tables = ['invoices', 'invoice_items', 'payments', 'notifications_log'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42501') {
            console.log(`✅ ${table}: RLS already enabled (permission denied = RLS active)`);
        } else if (error) {
            console.log(`⚠ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: Table exists, ${data?.length || 0} rows accessible`);
        }
    }

    console.log('\n📋 RLS needs to be enabled manually in Supabase Dashboard.');
    console.log('   Go to: Authentication > Policies');
    console.log('   Or run this SQL in SQL Editor:\n');

    console.log(`
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_policy ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY invoice_items_policy ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY payments_policy ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY notifications_log_policy ON notifications_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `);
}

enableRLS().catch(console.error);
