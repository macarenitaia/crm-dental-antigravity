-- 1. RE-ENABLE RLS EVERYWHERE
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamientos_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_queue ENABLE ROW LEVEL SECURITY;

-- 2. CLEAR OLD POLICIES
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Users can see own record" ON public.users;
DROP POLICY IF EXISTS "Users view self" ON public.users;
DROP POLICY IF EXISTS "SuperAdmin view all users" ON public.users;
DROP POLICY IF EXISTS "Service role full access users" ON public.users;

DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Tenants view access" ON public.tenants;
DROP POLICY IF EXISTS "Service role full access tenants" ON public.tenants;

-- 3. USERS TABLE: Non-recursive policies
CREATE POLICY "Users view self" ON public.users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "SuperAdmin view all users" ON public.users FOR SELECT USING ((auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com');
CREATE POLICY "Service role users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. TENANTS TABLE: Optimized policies
CREATE POLICY "Tenants view access" ON public.tenants FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND (auth.jwt() ->> 'email') = public.tenants.email)
    OR
    id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);
CREATE POLICY "Service role tenants" ON public.tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. OTHER TABLES: Link to tenant_id or cliente_id
-- We'll use a helper function if needed, but for now simple checks
DROP POLICY IF EXISTS "Public Read Clients" ON public.clients;
CREATE POLICY "Admin view tenant data" ON public.clients FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com' 
    OR 
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Similar for others... (Simplified for now to ensure access)
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Appointments" ON public.appointments;
CREATE POLICY "Admin view tenant appointments" ON public.appointments FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com' 
    OR 
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);
