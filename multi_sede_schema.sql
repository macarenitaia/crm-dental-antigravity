
-- 🌍 MIGRACIÓN MULTI-SEDE Y RLS

-- 1. Crear tabla Clinics
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

-- 2. Insertar Sedes de Ejemplo
INSERT INTO public.clinics (name, address) VALUES
('Sede Central', 'Calle Mayor 1'),
('Sede Norte', 'Avenida de la Ilustración 23');

-- 3. Añadir referencia en Appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id);

-- 4. Activar RLS (Row Level Security)
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Seguridad (Permisivas para el Playground/Anon)

-- Políticas para Clinics
CREATE POLICY "Public Read Clinics" ON public.clinics
  FOR SELECT TO anon, authenticated, service_role USING (true);

-- Políticas para Appointments
-- Permitimos leer y escribir a 'anon' para que el Dashboard funcione sin login complejo
CREATE POLICY "Public Read Appointments" ON public.appointments
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public Write Appointments" ON public.appointments
  FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

CREATE POLICY "Public Update Appointments" ON public.appointments
  FOR UPDATE TO anon, authenticated, service_role USING (true);

CREATE POLICY "Public Delete Appointments" ON public.appointments
  FOR DELETE TO anon, authenticated, service_role USING (true);

-- Nota: 'service_role' (usado por el Agente) siempre tiene bypass de RLS por defecto,
-- pero se incluyen en target roles por claridad.

COMMENT ON TABLE public.clinics IS 'Sedes de la clínica dental.';
