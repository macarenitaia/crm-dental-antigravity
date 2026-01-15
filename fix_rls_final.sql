-- Clean up existing policies
DROP POLICY IF EXISTS "Users can view same tenant users" ON public.users;
DROP POLICY IF EXISTS "Users view self" ON public.users;
DROP POLICY IF EXISTS "SuperAdmin view all" ON public.users;

-- New NON-RECURSIVE policies for users
-- 1. Users can see their own profile
CREATE POLICY "Users view self" ON public.users 
    FOR SELECT USING (auth_user_id = auth.uid());

-- 2. Super Admin can see everyone (using JWT email for speed and to avoid recursion)
CREATE POLICY "SuperAdmin view all users" ON public.users 
    FOR SELECT USING ((auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com');

-- 3. Users can see others in the same tenant (avoiding direct recursion)
-- This is still slightly tricky in Postgres, but we'll stick to the essentials for now
-- to unblock the login.

-- Clean up and fix Tenants policy
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;

CREATE POLICY "Tenants view access" ON public.tenants
    FOR SELECT USING (
        (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
        OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND tenant_id = public.tenants.id
        )
    );
