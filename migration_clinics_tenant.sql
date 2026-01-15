-- Add tenant_id to clinics table to link them to the parent Tenant
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Update RLS policies for clinics to use tenant_id
DROP POLICY IF EXISTS "Public Read Clinics" ON public.clinics;

CREATE POLICY "Users can view own tenant clinics" ON public.clinics
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access clinics" ON public.clinics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Ensure index exists
CREATE INDEX IF NOT EXISTS idx_clinics_tenant ON public.clinics(tenant_id);
