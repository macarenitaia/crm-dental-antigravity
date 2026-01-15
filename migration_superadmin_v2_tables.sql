-- Migration: Activate Superadmin Configuration Tables
-- This script creates dedicated tables for WhatsApp and AI settings per tenant.

-- 1. Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    phone_number_id TEXT,
    access_token TEXT,
    template_name TEXT DEFAULT 'confirmacion_cita',
    template_mapping JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id)
);

-- 2. Create ai_config_settings table
CREATE TABLE IF NOT EXISTS public.ai_config_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    custom_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id)
);

-- 3. Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Selective access based on tenant_id)
-- Note: SuperAdmins (using service_role) bypass these.
-- Users from the same tenant can view but not modify these settings directly.
CREATE POLICY "Tenants can view their own whatsapp settings" 
ON public.whatsapp_settings FOR SELECT 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE tenant_id = whatsapp_settings.tenant_id));

CREATE POLICY "Tenants can view their own ai settings" 
ON public.ai_config_settings FOR SELECT 
USING (auth.uid() IN (SELECT auth_user_id FROM public.users WHERE tenant_id = ai_config_settings.tenant_id));

-- 5. Helper Function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_settings_updated_at BEFORE UPDATE ON public.whatsapp_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ai_config_settings_updated_at BEFORE UPDATE ON public.ai_config_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
