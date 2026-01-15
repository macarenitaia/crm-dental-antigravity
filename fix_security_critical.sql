-- 1. SEPARATE SUPER ADMIN FROM DEMO CLINIC
-- Create a dedicated tenant for the Super Admin if it doesn't exist
INSERT INTO public.tenants (id, nombre, email, plan, active)
VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff', 
    'HQ Macarenita IA', 
    'macarenita.ia@gmail.com', 
    'enterprise',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Move Super Admin user to this new tenant
UPDATE public.users 
SET tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
WHERE email = 'macarenita.ia@gmail.com';

-- 2. HARDEN RLS ON ALL TABLES
-- Define list of tables and Enable RLS
ALTER TABLE public.clinical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_rectifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_clinics ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES (Using cliente_id/tenant_id)

-- Helper function to get current user's tenant_id (Avoids repeating subqueries)
-- Note: We use a stable function to caching within transaction if possible, or just standard subquery
-- Actually, let's keep it simple with standard policies to avoid migration complexity.

-- A) TABLES WITH cliente_id (Direct Tenant Link)
-- clinical_history, patient_treatments, invoices, payments, knowledge_base, notifications_log

-- Policy Template:
-- 1. Super Admin Bypass (by email or specific tenant ID)
-- 2. User Tenant Match

-- Clinical History
DROP POLICY IF EXISTS "Tenant Isolation clinical_history" ON public.clinical_history;
CREATE POLICY "Tenant Isolation clinical_history" ON public.clinical_history
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Patient Treatments
DROP POLICY IF EXISTS "Tenant Isolation patient_treatments" ON public.patient_treatments;
CREATE POLICY "Tenant Isolation patient_treatments" ON public.patient_treatments
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Invoices
DROP POLICY IF EXISTS "Tenant Isolation invoices" ON public.invoices;
CREATE POLICY "Tenant Isolation invoices" ON public.invoices
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Payments
DROP POLICY IF EXISTS "Tenant Isolation payments" ON public.payments;
CREATE POLICY "Tenant Isolation payments" ON public.payments
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Knowledge Base
DROP POLICY IF EXISTS "Tenant Isolation knowledge_base" ON public.knowledge_base;
CREATE POLICY "Tenant Isolation knowledge_base" ON public.knowledge_base
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- Notifications Log
DROP POLICY IF EXISTS "Tenant Isolation notifications_log" ON public.notifications_log;
CREATE POLICY "Tenant Isolation notifications_log" ON public.notifications_log
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
);

-- B) TABLES WITHOUT DIRECT cliente_id (Child Tables)
-- invoice_items -> invoice_id -> invoices.cliente_id

DROP POLICY IF EXISTS "Tenant Isolation invoice_items" ON public.invoice_items;
CREATE POLICY "Tenant Isolation invoice_items" ON public.invoice_items
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    invoice_id IN (
        SELECT id FROM public.invoices 
        WHERE cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- invoice_rectifications -> invoice_id
DROP POLICY IF EXISTS "Tenant Isolation invoice_rectifications" ON public.invoice_rectifications;
CREATE POLICY "Tenant Isolation invoice_rectifications" ON public.invoice_rectifications
FOR ALL USING (
    (auth.jwt() ->> 'email') = 'macarenita.ia@gmail.com'
    OR
    original_invoice_id IN (
        SELECT id FROM public.invoices 
        WHERE cliente_id IN (SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- treatment_phases -> treatment_id? No, let's check columns for this one.
-- Assuming treatment_phases links to treatments or patient_treatments.
-- If user didn't specify column, we skip or assume generic.
-- Wait, user listed it in UNRESTRICTED tables.
-- Let's just enable RLS to be safe; if it breaks, we fix.
-- Actually, better to check.
