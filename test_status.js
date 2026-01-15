
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatus() {
    // Get an existing ID
    const { data: apps } = await supabase.from('appointments').select('id').limit(1);
    if (!apps || apps.length === 0) {
        console.log("No appointments to test");
        return;
    }
    const id = apps[0].id;

    const candidates = ['confirmed', 'pending', 'booked', 'active', 'verified'];

    for (const status of candidates) {
        const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
        if (error) {
            console.log(`❌ Status '${status}' failed: ${error.message}`);
        } else {
            console.log(`✅ Status '${status}' SUCCESS`);
            // Revert
            await supabase.from('appointments').update({ status: 'scheduled' }).eq('id', id);
        }
    }
}

testStatus();
