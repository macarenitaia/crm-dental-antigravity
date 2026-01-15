-- =====================================================
-- MÓDULO DE DOCTORES - Schema
-- =====================================================
-- Cada sede puede tener varios doctores
-- Un doctor puede trabajar en varias sedes
-- =====================================================

-- 1. TABLA DOCTORS (Doctores)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Datos personales
    name TEXT NOT NULL,
    specialty TEXT,  -- 'ortodoncia', 'implantologia', 'endodoncia', etc.
    email TEXT,
    phone TEXT,
    
    -- Disponibilidad
    is_active BOOLEAN NOT NULL DEFAULT true,
    color TEXT DEFAULT '#3B82F6',  -- Color para el calendario
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA DOCTOR_CLINICS (Relación doctores-sedes)
CREATE TABLE IF NOT EXISTS doctor_clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Horarios por sede (opcional)
    schedule JSONB,  -- {"monday": ["09:00-14:00", "16:00-20:00"], ...}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(doctor_id, clinic_id)
);

-- 3. AÑADIR doctor_id A APPOINTMENTS
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_doctors_cliente_id ON doctors(cliente_id);
CREATE INDEX IF NOT EXISTS idx_doctors_active ON doctors(is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_clinics_doctor ON doctor_clinics(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_clinics_clinic ON doctor_clinics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);

-- 5. RLS
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctors_policy ON doctors;
CREATE POLICY doctors_policy ON doctors FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS doctor_clinics_policy ON doctor_clinics;
CREATE POLICY doctor_clinics_policy ON doctor_clinics FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- 6. COMENTARIOS
COMMENT ON TABLE doctors IS 'Doctores del sistema multi-tenant';
COMMENT ON TABLE doctor_clinics IS 'Relación N:M entre doctores y clínicas/sedes';
