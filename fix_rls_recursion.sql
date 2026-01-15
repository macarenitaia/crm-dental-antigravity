-- Fix: Remove recursive RLS policies on users table
-- The original policy checked tenant_id by querying users table itself = infinite recursion

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view same tenant users" ON public.users;
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;

-- Simpler policy: Users can see their own row (by auth_user_id)
CREATE POLICY "Users can see own record" ON public.users
    FOR SELECT USING (auth_user_id = auth.uid());

-- Simpler policy for tenants: Users can see tenant matching their user record
-- We use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Now use the function in policies
CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (id = public.get_user_tenant_id());

-- Update users policy to allow viewing same-tenant users via function
CREATE POLICY "Users can view same tenant users" ON public.users
    FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- Grant execute on function
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO anon;
