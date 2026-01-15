-- 1. Añadir columnas a la tabla de facturas
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS is_fractional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_percent INTEGER DEFAULT 100;

-- 2. Actualizar create_invoice_safe para manejar pagos automáticos e is_fractional
CREATE OR REPLACE FUNCTION public.create_invoice_safe(
    p_tenant_id UUID,
    p_client_id UUID,
    p_clinic_id UUID,
    p_treatment_id UUID,
    p_items JSONB,
    p_notes TEXT,
    p_paid_amount NUMERIC,
    p_is_fractional BOOLEAN DEFAULT false,
    p_payment_percent INTEGER DEFAULT 100
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
    v_status TEXT;
BEGIN
    -- 1. Calcular totales
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_subtotal := v_subtotal + (v_item->>'total')::NUMERIC;
    END LOOP;
    
    v_total := v_subtotal;

    -- 2. Determinar estado inicial
    IF p_paid_amount >= v_total THEN
        v_status := 'paid';
    ELSIF p_paid_amount > 0 THEN
        v_status := 'partial';
    ELSE
        v_status := 'sent';
    END IF;

    -- 3. Bloqueo atómico para número de factura
    LOCK TABLE public.invoices IN SHARE ROW EXCLUSIVE MODE;

    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_prefix := 'FAC-' || v_year || '-';

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix) + 1) AS INTEGER)), 0)
    INTO v_last_number
    FROM public.invoices
    WHERE invoice_number LIKE v_prefix || '%'
    AND cliente_id = p_tenant_id;

    v_next_number := v_last_number + 1;
    v_invoice_number := v_prefix || LPAD(v_next_number::TEXT, 5, '0');

    -- 4. Insertar factura
    INSERT INTO public.invoices (
        cliente_id,
        invoice_number,
        client_id,
        clinic_id,
        treatment_id,
        subtotal,
        total,
        paid_amount,
        status,
        notes,
        is_fractional,
        payment_percent,
        issue_date,
        due_date
    ) VALUES (
        p_tenant_id,
        v_invoice_number,
        p_client_id,
        p_clinic_id,
        p_treatment_id,
        v_subtotal,
        v_total,
        p_paid_amount,
        v_status,
        p_notes,
        p_is_fractional,
        p_payment_percent,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days'
    ) RETURNING id INTO v_invoice_id;

    -- 5. Insertar ítems
    IF jsonb_array_length(p_items) > 0 THEN
        INSERT INTO public.invoice_items (
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
            (item->>'unitPrice')::NUMERIC,
            (item->>'total')::NUMERIC,
            (item->>'sort_order')::INTEGER
        FROM jsonb_array_elements(p_items) AS item;
    END IF;

    -- 6. Registrar pago si hay importe pagado
    IF p_paid_amount > 0 THEN
        INSERT INTO public.payments (
            invoice_id,
            cliente_id,
            amount,
            method,
            notes
        ) VALUES (
            v_invoice_id,
            p_tenant_id,
            p_paid_amount,
            'other',
            'Pago inicial al crear factura'
        );
    END IF;

    -- 7. Actualizar tratamiento si está vinculado
    IF p_treatment_id IS NOT NULL THEN
        UPDATE public.patient_treatments
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

-- 8. Crear función cancel_invoice_safe
CREATE OR REPLACE FUNCTION public.cancel_invoice_safe(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    -- 1. Obtener datos de la factura
    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Factura no encontrada');
    END IF;

    IF v_invoice.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'La factura ya está cancelada');
    END IF;

    -- 2. Revertir importe en tratamiento vinculado
    IF v_invoice.treatment_id IS NOT NULL THEN
        UPDATE public.patient_treatments
        SET invoiced_amount = GREATEST(0, COALESCE(invoiced_amount, 0) - v_invoice.subtotal)
        WHERE id = v_invoice.treatment_id;
    END IF;

    -- 3. Actualizar estado de la factura
    UPDATE public.invoices
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_invoice_id;

    -- 4. Opcional: Podríamos anular pagos asociados aquí si fuera necesario
    -- De momento los dejamos para Auditoría o los marcamos como nulos si el negocio lo requiere.

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
