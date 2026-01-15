
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('appointments')
        .select('status');

    if (error) {
        console.error(error);
    } else {
        const statuses = new Set(data.map(d => d.status));
        console.log("Existing statuses in DB:", [...statuses]);
    }
}

check();
