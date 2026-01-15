
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDemoUser() {
    console.log('Fixing demo user tenant...');
    const targetTenantId = 'd79a74e6-3aac-4c0c-b7ad-03bda6ea3ab6'; // Macarena alvarez tenant

    const { data, error } = await supabase
        .from('users')
        .update({ tenant_id: targetTenantId })
        .eq('email', 'demo@clinica.com')
        .select();

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('User updated successfully:', data);
    }
}

fixDemoUser();
