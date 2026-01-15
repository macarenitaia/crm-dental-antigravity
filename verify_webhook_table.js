const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableAndTest() {
    // 1. Check if table exists
    console.log('1. Checking if webhook_logs table exists...');
    const { data, error } = await supabase
        .from('webhook_logs')
        .select('id')
        .limit(1);

    if (error) {
        console.log('❌ Table does NOT exist or has RLS issues:', error.message);
        console.log('\n⚠️  You need to run the migration in Supabase SQL Editor!');
        console.log('Copy the contents of migration_webhook_logs.sql and run it.');
        return;
    }

    console.log('✅ Table exists!');

    // 2. Try to insert a test record
    console.log('\n2. Testing insert...');
    const { error: insertError } = await supabase
        .from('webhook_logs')
        .insert({
            method: 'TEST',
            url: 'local-test',
            status_code: 999
        });

    if (insertError) {
        console.log('❌ Insert failed:', insertError.message);
    } else {
        console.log('✅ Insert successful!');
    }

    // 3. Fetch records
    console.log('\n3. Fetching all records...');
    const { data: logs, error: fetchError } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (fetchError) {
        console.log('❌ Fetch failed:', fetchError.message);
    } else {
        console.log(`Found ${logs?.length || 0} records:`);
        logs?.forEach(log => {
            console.log(`  - ${log.method} | ${log.status_code} | ${log.created_at}`);
        });
    }
}

checkTableAndTest();
