-- Migration: Tenant Authentication System
-- Creates tenants and users tables with proper RLS

-- 1. Create Tenants Table (Each client/clinic is a tenant)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    email text UNIQUE,
    plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Create Users Table (CRM operators, not patients)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    auth_user_id uuid UNIQUE, -- Links to Supabase auth.users
    email text NOT NULL,
    name text,
    role text DEFAULT 'admin' CHECK (role IN ('admin', 'doctor', 'reception')),
    created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Tenants
-- Users can only see their own tenant
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Service role can do everything (for admin operations)
DROP POLICY IF EXISTS "Service role full access tenants" ON public.tenants;
CREATE POLICY "Service role full access tenants" ON public.tenants
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. RLS Policies for Users
-- Users can only see users in their tenant
DROP POLICY IF EXISTS "Users can view same tenant users" ON public.users;
CREATE POLICY "Users can view same tenant users" ON public.users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);

-- 7. Seed Demo Tenant (for development)
INSERT INTO public.tenants (id, nombre, email, plan) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Demo Clinic', 'demo@example.com', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Note: Demo user will be created after Supabase Auth user is created
