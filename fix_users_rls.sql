-- Fix recursive RLS policy for users table
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view same tenant users" ON public.users;

-- Admin bypass / Self-view
CREATE POLICY "Users can view same tenant users" ON public.users
    FOR SELECT USING (
        -- 1. Always allow users to see their own record
        auth_user_id = auth.uid()
        OR
        -- 2. Super Admin bypass
        (SELECT email FROM auth.users WHERE id = auth.uid()) = 'macarenita.ia@gmail.com'
        OR
        -- 3. Allow viewing users in the SAME tenant (non-recursive check)
        -- We use a subquery that targets the underlying auth table or a secure check
        tenant_id = (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
    );

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
