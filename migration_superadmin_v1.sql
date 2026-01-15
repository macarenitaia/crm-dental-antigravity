-- Super Admin Extensions Migration

-- 1. Extend tenants for AI configuration
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{
  "whatsapp_keys": {"api_key": "", "phone_id": ""},
  "whatsapp_templates": {"confirmation": "confirmacion_cita", "mapping": {"{{1}}": "patient_name", "{{2}}": "date", "{{3}}": "time"}},
  "user_prompt": "Eres una asistente dental experta..."
}';

-- 2. Extend clinics for Google Reviews
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS google_review_link TEXT;

-- 3. Extend treatments with price and description
ALTER TABLE public.tratamientos_new 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- 4. Ensure RLS for ai_config
-- Adding policies to let SuperAdmins (if we have a role for them) or service_role access everything
-- For now, the application uses supabaseAdmin (service_role) for superadmin tasks, so no new policies strictly required for "all-access"
-- but let's ensure the data is isolated for the tenant users.
