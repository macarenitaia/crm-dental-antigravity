-- Migration: Add clinical history and patient assignments
-- Run this in Supabase SQL Editor

-- 1. Add assignment fields to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID REFERENCES clinics(id),
ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES doctors(id);

-- 2. Create clinical_history table
CREATE TABLE IF NOT EXISTS clinical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id),
    clinic_id UUID REFERENCES clinics(id),
    cliente_id UUID REFERENCES tenants(id), -- tenant isolation
    
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    diagnosis TEXT,
    treatment TEXT,
    observations TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_clinical_history_client ON clinical_history(client_id);
CREATE INDEX IF NOT EXISTS idx_clinical_history_tenant ON clinical_history(cliente_id);

-- 4. Enable RLS
ALTER TABLE clinical_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy - tenant isolation
CREATE POLICY "clinical_history_tenant_isolation" ON clinical_history
    FOR ALL USING (cliente_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- 6. Grant permissions
GRANT ALL ON clinical_history TO authenticated;

-- 7. Sample data for testing (optional - for Barcelona tenant)
-- INSERT INTO clinical_history (client_id, doctor_id, clinic_id, cliente_id, date, diagnosis, treatment, observations)
-- SELECT 
--     c.id,
--     d.id,
--     cl.id,
--     c.cliente_id,
--     CURRENT_DATE - INTERVAL '14 days',
--     'Caries en molar inferior derecho',
--     'Empaste de composite fotopolimerizable',
--     'Paciente sin molestias post-tratamiento. Revisión en 6 meses.'
-- FROM clients c
-- CROSS JOIN (SELECT id FROM doctors LIMIT 1) d
-- CROSS JOIN (SELECT id FROM clinics LIMIT 1) cl
-- WHERE c.name LIKE '%Carla%'
-- LIMIT 1;
