-- Create a sequence for invoice numbers if it doesn't exist (optional, but good practice).
-- Ideally, we use the table itself to determine the next number to ensure continuity with existing data.

CREATE OR REPLACE FUNCTION create_invoice_safe(
    p_tenant_id UUID,
    p_client_id UUID,
    p_clinic_id UUID,
    p_treatment_id UUID,
    p_items JSONB, -- Array of objects: { description, quantity, unit_price, total, sort_order }
    p_notes TEXT,
    p_paid_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year TEXT;
    v_prefix TEXT;
    v_last_number INT;
    v_next_number INT;
    v_invoice_number TEXT;
    v_invoice_id UUID;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_item JSONB;
BEGIN
    -- 1. Calculate Totals from Items to ensure backend truth
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_subtotal := v_subtotal + (v_item->>'total')::NUMERIC;
    END LOOP;
    
    v_total := v_subtotal; -- Add tax logic here if needed

    -- 2. Generate Invoice Number (Atomic Lock)
    -- We lock the table for insertion to prevent race conditions on number generation
    LOCK TABLE invoices IN SHARE ROW EXCLUSIVE MODE;

    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_prefix := 'FAC-' || v_year || '-';

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS INTEGER)), 0)
    INTO v_last_number
    FROM invoices
    WHERE invoice_number LIKE v_prefix || '%'
    AND cliente_id = p_tenant_id;

    v_next_number := v_last_number + 1;
    v_invoice_number := v_prefix || LPAD(v_next_number::TEXT, 5, '0');

    -- 3. Insert Invoice
    INSERT INTO invoices (
        cliente_id,
        invoice_number,
        client_id,
        clinic_id,
        treatment_id,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        paid_amount,
        status,
        notes,
        issue_date,
        due_date
    ) VALUES (
        p_tenant_id,
        v_invoice_number,
        p_client_id,
        p_clinic_id,
        p_treatment_id,
        v_subtotal,
        0,
        0,
        v_total,
        p_paid_amount,
        'draft',
        p_notes,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days'
    ) RETURNING id INTO v_invoice_id;

    -- 4. Insert Items
    IF jsonb_array_length(p_items) > 0 THEN
        INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            total,
            sort_order
        )
        SELECT
            v_invoice_id,
            item->>'description',
            (item->>'quantity')::NUMERIC,
            (item->>'unitPrice')::NUMERIC, -- Note: camelCase in JSON input
            (item->>'total')::NUMERIC,
            (item->>'sort_order')::INTEGER
        FROM jsonb_array_elements(p_items) AS item;
    END IF;

    -- 5. Update Treatment if linked
    IF p_treatment_id IS NOT NULL THEN
        UPDATE patient_treatments
        SET invoiced_amount = COALESCE(invoiced_amount, 0) + v_subtotal
        WHERE id = p_treatment_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
