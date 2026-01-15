-- Super Admin bypass for tenants table
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;

CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (
        -- 1. Regular user check
        id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
        OR
        -- 2. Super Admin bypass
        (SELECT email FROM auth.users WHERE id = auth.uid()) = 'macarenita.ia@gmail.com'
    );
