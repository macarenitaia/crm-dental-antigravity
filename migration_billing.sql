-- =====================================================
-- MÓDULO DE FACTURACIÓN INTELIGENTE - Schema
-- =====================================================
-- Tablas: invoices, invoice_items, payments, notifications_log
-- Funciones: generate_invoice_number(), auto-create trigger
-- =====================================================

-- 1. SEQUENCE para números de factura
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- 2. TABLA INVOICES (Facturas)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    
    -- Referencias
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    
    -- Importes (NUMERIC para precisión)
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0% exento sanidad
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
    
    -- Fechas
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    
    -- Pagos
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Preferencias de envío
    send_method TEXT CHECK (send_method IN ('email', 'whatsapp', 'both', 'none')),
    
    -- Notas
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- 3. TABLA INVOICE_ITEMS (Líneas de factura)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Descripción
    description TEXT NOT NULL,
    treatment_type TEXT,  -- Para analytics: 'ortodoncia', 'implante', 'limpieza', etc.
    
    -- Cantidades
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Orden
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA PAYMENTS (Pagos)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Importe
    amount NUMERIC(10,2) NOT NULL,
    
    -- Método
    method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'transfer', 'bizum', 'financing', 'other')),
    
    -- Referencia externa (nº transferencia, etc.)
    reference TEXT,
    
    -- Notas
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- 5. TABLA NOTIFICATIONS_LOG (Historial de envíos)
CREATE TABLE IF NOT EXISTS notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Tipo y destinatario
    type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
    recipient TEXT NOT NULL,
    
    -- Contenido
    subject TEXT,
    message_preview TEXT,
    
    -- Estado
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    error_message TEXT,
    
    -- Tipo de notificación
    notification_type TEXT CHECK (notification_type IN ('invoice', 'reminder', 'receipt', 'overdue')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- 6. FUNCIÓN: Generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number(tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
    prefix TEXT;
BEGIN
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- Obtener siguiente número para este tenant/año
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM 'FAC-' || year_str || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM invoices
    WHERE cliente_id = tenant_id
    AND invoice_number LIKE 'FAC-' || year_str || '-%';
    
    RETURN 'FAC-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN: Actualizar totales de factura
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET 
        subtotal = (SELECT COALESCE(SUM(total), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id),
        total = (SELECT COALESCE(SUM(total), 0) FROM invoice_items WHERE invoice_id = NEW.invoice_id) - discount_amount,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoice_items
FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- 8. FUNCIÓN: Actualizar paid_amount y status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    inv_total NUMERIC(10,2);
    total_paid NUMERIC(10,2);
BEGIN
    -- Calcular total pagado
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM payments WHERE invoice_id = NEW.invoice_id;
    
    -- Obtener total de factura
    SELECT total INTO inv_total FROM invoices WHERE id = NEW.invoice_id;
    
    -- Actualizar factura
    UPDATE invoices
    SET 
        paid_amount = total_paid,
        status = CASE 
            WHEN total_paid >= inv_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE status
        END,
        paid_at = CASE WHEN total_paid >= inv_total THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_status_trigger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

-- 9. ÍNDICES para rendimiento
CREATE INDEX IF NOT EXISTS idx_invoices_cliente_id ON invoices(cliente_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_notifications_invoice_id ON notifications_log(invoice_id);

-- 10. RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para authenticated users
CREATE POLICY invoices_policy ON invoices FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
CREATE POLICY invoice_items_policy ON invoice_items FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
CREATE POLICY payments_policy ON payments FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
CREATE POLICY notifications_log_policy ON notifications_log FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

-- 11. Comentarios
COMMENT ON TABLE invoices IS 'Facturas del sistema de facturación inteligente';
COMMENT ON TABLE invoice_items IS 'Líneas/conceptos de cada factura';
COMMENT ON TABLE payments IS 'Registro de pagos parciales o totales';
COMMENT ON TABLE notifications_log IS 'Historial de envíos de facturas y recordatorios';
