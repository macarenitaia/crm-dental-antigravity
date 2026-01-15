-- Refinar sincronización de estado de factura
CREATE OR REPLACE FUNCTION public.update_invoice_status_on_total_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el total cambia, recalculamos el estado basado en paid_amount
    NEW.status := CASE 
        WHEN NEW.paid_amount >= NEW.total AND NEW.total > 0 THEN 'paid'
        WHEN NEW.paid_amount > 0 THEN 'partial'
        ELSE 'sent'
    END;
    
    -- Si está pagado, guardamos la fecha
    IF NEW.paid_amount >= NEW.total AND NEW.total > 0 THEN
        NEW.paid_at := NOW();
    ELSE
        NEW.paid_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cambios en la tabla invoices (total o paid_amount)
DROP TRIGGER IF EXISTS trg_update_invoice_status ON public.invoices;
CREATE TRIGGER trg_update_invoice_status
BEFORE UPDATE OF total, paid_amount ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_status_on_total_change();
