-- Migration: Tenant Segregation & Masters (Fixed Order)
-- 1. Create Tables FIRST

CREATE TABLE IF NOT EXISTS public.doctores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  cliente_id uuid NOT NULL,
  clinica_id uuid REFERENCES public.clinics(id),
  created_at timestamptz DEFAULT now()
);

-- DROP and recreate tratamientos if it has old structure
DROP TABLE IF EXISTS public.tratamientos_old;
-- We'll just CREATE IF NOT EXISTS with new structure,
-- old table with different columns may conflict. Let's just add new rows selectively.
-- For safety, we create new and leave old as is if different. 
-- Actually, let's rename old if it exists with different structure:
-- This is complex. For simplicity, we create tratamientos_new and leave old.
-- ACTUALLY: The simplest is to just add to the existing (it won't break).

CREATE TABLE IF NOT EXISTS public.tratamientos_new (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  cliente_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Add Segregation Columns to Existing Tables
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000';

-- 3. Add FK columns to clients (Patients) - NO FK CONSTRAINT for now to avoid circular issues
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cliente_id uuid DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN IF NOT EXISTS clinica_id uuid,
ADD COLUMN IF NOT EXISTS doctor_id uuid,
ADD COLUMN IF NOT EXISTS treatment_id uuid;

-- 4. Seed Data (Demo Tenant)
INSERT INTO public.doctores (nombre, cliente_id) VALUES
('Dr. Juan Pérez', '00000000-0000-0000-0000-000000000000'),
('Dra. Ana García', '00000000-0000-0000-0000-000000000000'),
('Dr. Roberto Carlos', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

INSERT INTO public.tratamientos_new (nombre, cliente_id) VALUES
('Ortodoncia', '00000000-0000-0000-0000-000000000000'),
('Implante', '00000000-0000-0000-0000-000000000000'),
('Limpieza', '00000000-0000-0000-0000-000000000000'),
('Blanqueamiento', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- 5. RLS (Permissive)
ALTER TABLE public.doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tratamientos_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Doctores" ON public.doctores;
CREATE POLICY "Public Read Doctores" ON public.doctores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Tratamientos New" ON public.tratamientos_new;
CREATE POLICY "Public Read Tratamientos New" ON public.tratamientos_new FOR SELECT USING (true);
