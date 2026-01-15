/**
 * FIX RLS POLICIES FOR USERS TABLE
 * Allows authenticated users to read user profiles
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
    console.log('🔧 Fixing RLS policies...\n');

    // First, let's check current policies
    const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'users');

    console.log('Current policies on users:', policies?.length || 0);

    // Try to fix by directly querying
    // The issue is that after SIGN_IN, the user needs to read from 'users' table
    // but RLS might be blocking it

    // Let's test if we can read user with service role
    const email = 'barcelona@smile.com';
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (userError) {
        console.log('❌ Error reading user:', userError.message);
    } else {
        console.log('✅ User found:', user.email, user.name);
        console.log('   auth_user_id:', user.auth_user_id);
        console.log('   tenant_id:', user.tenant_id);
    }

    // Check tenants table
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', user?.tenant_id)
        .single();

    if (tenantError) {
        console.log('❌ Error reading tenant:', tenantError.message);
    } else {
        console.log('✅ Tenant found:', tenant.nombre);
    }

    // The fix: We need to ensure policies allow SELECT
    // Let's create a simple permissive policy via raw SQL
    console.log('\n📋 SQL to run in Supabase Dashboard:');
    console.log('----------------------------------------');
    console.log(`
-- Fix users table RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_policy" ON users;
DROP POLICY IF EXISTS "users_select" ON users;

-- Allow authenticated users to read any user (needed for profile lookup)
CREATE POLICY "users_select_all" ON users
FOR SELECT TO authenticated
USING (true);

-- Fix tenants table RLS  
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_all" ON tenants;
DROP POLICY IF EXISTS "tenants_policy" ON tenants;

CREATE POLICY "tenants_select_all" ON tenants
FOR SELECT TO authenticated
USING (true);
`);
    console.log('----------------------------------------');
    console.log('\n👆 Copy and run this SQL in Supabase SQL Editor');
}

fixRLS().catch(console.error);
