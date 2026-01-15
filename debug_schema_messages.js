
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
    // Try to select a single row and see the keys
    const { data, error } = await supabase.from('messages').select('*').limit(1);

    if (error) {
        console.log("Error selecting *:", error);
    } else if (data && data.length > 0) {
        console.log("Existing keys in a message row:", Object.keys(data[0]));
    } else {
        console.log("Table is empty, cannot infer keys from data. Attempting insertion test.");
        // Try inserting with 'clientId' or 'user_id'
        testInsert('clientId');
        testInsert('user_id');
        testInsert('client');
    }
}

async function testInsert(keyName) {
    const payload = { content: 'test', role: 'user' };
    payload[keyName] = '00000000-0000-0000-0000-000000000000'; // Dummy UUID

    const { error } = await supabase.from('messages').insert(payload);
    if (error) {
        console.log(`Insert with '${keyName}' failed: ${error.message}`);
    } else {
        console.log(`✅ Insert with '${keyName}' SUCCEEDED (or likely valid column)`);
    }
}

inspectColumns();
