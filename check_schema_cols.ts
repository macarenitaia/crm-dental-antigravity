
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    // We can't directly check schema with client unless we query structure or try an empty insert
    // But we can just try to select * limit 1 and see the keys

    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting appointments:', error);
    } else {
        console.log('Appointments sample keys:', data && data.length > 0 ? Object.keys(data[0]) : 'Table empty or no access');
    }
}

checkSchema();
