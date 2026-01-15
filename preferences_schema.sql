
-- Add preferred_clinic_id to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS preferred_clinic_id uuid REFERENCES public.clinics(id);

COMMENT ON COLUMN public.clients.preferred_clinic_id IS 'ID de la clínica preferida por el cliente (Sticky Preference).';
