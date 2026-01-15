-- =====================================================
-- MÓDULO DE TRATAMIENTOS INTEGRADO CON FACTURACIÓN
-- =====================================================
-- Tablas: patient_treatments, treatment_phases, account_balances, invoice_rectifications
-- Modificaciones: invoices (nuevas columnas)
-- =====================================================

-- 1. TABLA PATIENT_TREATMENTS (Tratamientos por Paciente)
-- El vínculo principal entre paciente y sus tratamientos
CREATE TABLE IF NOT EXISTS patient_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    treatment_type_id UUID REFERENCES tratamientos_new(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    
    -- Descripción
    name TEXT NOT NULL,
    tooth_numbers TEXT,  -- Piezas dentales (ej: "14,15,16" o "Arcada superior")
    notes TEXT,
    
    -- Estado del tratamiento
    status TEXT NOT NULL DEFAULT 'quoted' 
        CHECK (status IN ('quoted', 'accepted', 'in_progress', 'completed', 'cancelled')),
    
    -- Presupuesto
    budget_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    budget_accepted_at TIMESTAMPTZ,
    
    -- Producción vs Facturación vs Cobrado
    invoiced_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Fechas
    start_date DATE,
    estimated_end_date DATE,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA TREATMENT_PHASES (Fases del Tratamiento)
-- Para facturación por hitos
CREATE TABLE IF NOT EXISTS treatment_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_id UUID NOT NULL REFERENCES patient_treatments(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL DEFAULT 1,
    
    -- Importe de esta fase
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'invoiced')),
    
    -- Enlace a factura (cuando se factura)
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABLA ACCOUNT_BALANCES (Entregas a Cuenta / Saldo a Favor)
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Tipo de movimiento
    type TEXT NOT NULL CHECK (type IN ('deposit', 'usage', 'refund')),
    
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    
    -- Referencias
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    -- Balance después de este movimiento
    balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 4. TABLA INVOICE_RECTIFICATIONS (Facturas Rectificativas)
CREATE TABLE IF NOT EXISTS invoice_rectifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    rectifying_invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 5. MODIFICAR TABLA INVOICES - Añadir columnas de tratamiento
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS treatment_id UUID REFERENCES patient_treatments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phase_id UUID REFERENCES treatment_phases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_rectification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rectified_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 6. ÍNDICES para rendimiento
CREATE INDEX IF NOT EXISTS idx_patient_treatments_cliente_id ON patient_treatments(cliente_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_client_id ON patient_treatments(client_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_status ON patient_treatments(status);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_doctor ON patient_treatments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatment_phases_treatment ON treatment_phases(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_phases_invoice ON treatment_phases(invoice_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_client ON account_balances(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_treatment ON invoices(treatment_id);

-- 7. FUNCIÓN: Actualizar totales del tratamiento cuando se factura
CREATE OR REPLACE FUNCTION update_treatment_invoiced()
RETURNS TRIGGER AS $$
BEGIN
    -- Cuando se crea una factura con treatment_id, actualizar invoiced_amount
    IF NEW.treatment_id IS NOT NULL THEN
        UPDATE patient_treatments
        SET invoiced_amount = invoiced_amount + NEW.total,
            updated_at = NOW()
        WHERE id = NEW.treatment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_treatment_invoiced_trigger ON invoices;
CREATE TRIGGER update_treatment_invoiced_trigger
AFTER INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION update_treatment_invoiced();

-- 8. FUNCIÓN: Actualizar paid_amount del tratamiento cuando se registra pago
CREATE OR REPLACE FUNCTION update_treatment_paid()
RETURNS TRIGGER AS $$
DECLARE
    inv_treatment_id UUID;
BEGIN
    -- Obtener treatment_id de la factura
    SELECT treatment_id INTO inv_treatment_id FROM invoices WHERE id = NEW.invoice_id;
    
    IF inv_treatment_id IS NOT NULL THEN
        UPDATE patient_treatments
        SET paid_amount = paid_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = inv_treatment_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_treatment_paid_trigger ON payments;
CREATE TRIGGER update_treatment_paid_trigger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_treatment_paid();

-- 9. RLS Policies
ALTER TABLE patient_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_rectifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_treatments_policy ON patient_treatments;
CREATE POLICY patient_treatments_policy ON patient_treatments FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS treatment_phases_policy ON treatment_phases;
CREATE POLICY treatment_phases_policy ON treatment_phases FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS account_balances_policy ON account_balances;
CREATE POLICY account_balances_policy ON account_balances FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoice_rectifications_policy ON invoice_rectifications;
CREATE POLICY invoice_rectifications_policy ON invoice_rectifications FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- 10. COMENTARIOS
COMMENT ON TABLE patient_treatments IS 'Tratamientos asignados a pacientes con presupuesto y seguimiento';
COMMENT ON TABLE treatment_phases IS 'Fases/hitos de un tratamiento para facturación parcial';
COMMENT ON TABLE account_balances IS 'Movimientos de saldo a favor (entregas a cuenta)';
COMMENT ON TABLE invoice_rectifications IS 'Registro de facturas rectificativas (trazabilidad)';
COMMENT ON COLUMN patient_treatments.invoiced_amount IS 'Total facturado de este tratamiento';
COMMENT ON COLUMN patient_treatments.paid_amount IS 'Total cobrado de este tratamiento';
