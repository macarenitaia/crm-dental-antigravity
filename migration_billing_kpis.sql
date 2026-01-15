-- Optimización de cálculo de KPIs de facturación
-- Mueve la lógica de aggregación de Javascript a PostgreSQL
-- Fecha: 2026-01-02

CREATE OR REPLACE FUNCTION get_billing_stats(input_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    now_date TIMESTAMP;
    start_of_month TIMESTAMP;
    start_of_last_month TIMESTAMP;
    end_of_last_month TIMESTAMP;
    
    invoiced_this_month NUMERIC;
    paid_this_month NUMERIC;
    invoiced_last_month NUMERIC;
    
    pending_collection NUMERIC;
    overdue_amount NUMERIC;
    
    invoice_count INTEGER;
    payments_json JSON;
    result JSON;
BEGIN
    -- Definir fechas clave
    now_date := NOW();
    start_of_month := DATE_TRUNC('month', now_date);
    start_of_last_month := DATE_TRUNC('month', now_date - INTERVAL '1 month');
    end_of_last_month := DATE_TRUNC('month', now_date) - INTERVAL '1 second';

    -- 1. Métricas de ESTE mes
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(paid_amount), 0),
        COUNT(*)
    INTO invoiced_this_month, paid_this_month, invoice_count
    FROM invoices 
    WHERE cliente_id = input_tenant_id 
      AND issue_date >= start_of_month
      AND status != 'cancelled';

    -- 2. Métricas del mes ANTERIOR
    SELECT 
        COALESCE(SUM(total), 0)
    INTO invoiced_last_month
    FROM invoices 
    WHERE cliente_id = input_tenant_id 
      AND issue_date >= start_of_last_month
      AND issue_date <= end_of_last_month
      AND status != 'cancelled';

    -- 3. Pendiente de cobro (TOTAL acumulado)
    SELECT 
        COALESCE(SUM(total - paid_amount), 0)
    INTO pending_collection
    FROM invoices
    WHERE cliente_id = input_tenant_id
      AND status IN ('sent', 'partial', 'overdue');

    -- 4. Vencido (TOTAL acumulado)
    SELECT 
        COALESCE(SUM(total - paid_amount), 0)
    INTO overdue_amount
    FROM invoices
    WHERE cliente_id = input_tenant_id
      AND status = 'overdue';

    -- 5. Pagos por método (este mes)
    SELECT json_object_agg(method, amount)
    INTO payments_json
    FROM (
        SELECT method, SUM(amount) as amount
        FROM payments
        WHERE cliente_id = input_tenant_id
          AND created_at >= start_of_month
        GROUP BY method
    ) p;

    -- Construir resultado final
    result := json_build_object(
        'invoicedThisMonth', invoiced_this_month,
        'invoicedLastMonth', invoiced_last_month,
        'pendingCollection', pending_collection,
        'overdueAmount', overdue_amount,
        'collectionRate', CASE WHEN invoiced_this_month > 0 THEN (paid_this_month / invoiced_this_month) * 100 ELSE 0 END,
        'averageInvoice', CASE WHEN invoice_count > 0 THEN invoiced_this_month / invoice_count ELSE 0 END,
        'invoiceCount', invoice_count,
        'paymentsByMethod', COALESCE(payments_json, '{}'::JSON)
    );

    RETURN result;
END;
$$;
