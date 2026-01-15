import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export const useInvoiceForm = (onSuccess?: () => void) => {
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(false);

    // Form State
    const [clientId, setClientId] = useState('');
    const [clinicId, setClinicId] = useState('');
    const [treatmentId, setTreatmentId] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const [notes, setNotes] = useState('');

    // Payment Options
    const [hasInsurance, setHasInsurance] = useState(false);
    const [insuranceAmount, setInsuranceAmount] = useState(0);
    const [insuranceName, setInsuranceName] = useState('');
    const [isFractional, setIsFractional] = useState(false);
    const [paymentPercent, setPaymentPercent] = useState(100);

    // Calculations
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
    const afterInsurance = subtotal - (hasInsurance ? insuranceAmount : 0);
    const invoiceAmount = isFractional ? (afterInsurance * paymentPercent / 100) : afterInsurance;

    // Load existing invoice for editing
    const loadInvoice = useCallback((invoice: any) => {
        setClientId(invoice.client_id || '');
        setClinicId(invoice.clinic_id || '');
        setTreatmentId(invoice.treatment_id || '');
        setNotes(invoice.notes || '');
        setIsFractional(invoice.is_fractional || false);
        setPaymentPercent(invoice.payment_percent || 100);

        if (invoice.invoice_items && invoice.invoice_items.length > 0) {
            setItems(invoice.invoice_items.map((i: any) => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unit_price,
                total: i.total
            })));
        }
    }, []);

    // Actions
    const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);

    const removeItem = (index: number) => {
        if (items.length > 1) setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'description') {
            newItems[index].description = value as string;
        } else {
            const numValue = Number(value) || 0;
            newItems[index][field] = numValue;
            newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        }
        setItems(newItems);
    };

    const resetForm = useCallback(() => {
        setClientId('');
        setClinicId('');
        setTreatmentId('');
        setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
        setNotes('');
        setHasInsurance(false);
        setInsuranceAmount(0);
        setInsuranceName('');
        setIsFractional(false);
        setPaymentPercent(100);
    }, []);

    const submitInvoice = async () => {
        if (!clientId || !tenantId) return;

        setLoading(true);
        try {
            // Prepare payload
            let finalNotes = notes;
            if (hasInsurance && insuranceAmount > 0) {
                finalNotes = `[Aseguradora: ${insuranceName || 'Sin especificar'} - Cubre: €${insuranceAmount.toFixed(2)}]\n${notes}`;
            }

            // Call RPC
            const { data, error } = await supabase.rpc('create_invoice_safe', {
                p_tenant_id: tenantId,
                p_client_id: clientId,
                p_clinic_id: clinicId || null,
                p_treatment_id: treatmentId || null,
                p_items: items.filter(i => i.description && i.total > 0).map((i, idx) => ({ ...i, sort_order: idx })),
                p_notes: finalNotes,
                p_paid_amount: invoiceAmount,
                p_is_fractional: isFractional,
                p_payment_percent: paymentPercent
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Error creando factura');

            alert('✅ Factura creada: ' + data.invoice_number);
            onSuccess?.();
            resetForm();
        } catch (err: any) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateInvoice = async (invoiceId: string) => {
        if (!clientId || !tenantId || !invoiceId) return;

        setLoading(true);
        try {
            // 1. Update main invoice
            const { error: invError } = await supabase
                .from('invoices')
                .update({
                    client_id: clientId,
                    clinic_id: clinicId || null,
                    treatment_id: treatmentId || null,
                    total: subtotal, // FULL subtotal (after insurance logic usually handled in items or notes)
                    paid_amount: invoiceAmount, // Set the current paid amount
                    is_fractional: isFractional,
                    payment_percent: paymentPercent,
                    notes: notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId);

            if (invError) throw invError;

            // 2. Refresh items (Delete and Re-insert is simplest since it's a small set)
            await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);

            const { error: itemsError } = await supabase.from('invoice_items').insert(
                items.filter(i => i.description && i.total > 0).map((i, idx) => ({
                    invoice_id: invoiceId,
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unitPrice,
                    total: i.total,
                    sort_order: idx
                }))
            );

            if (itemsError) throw itemsError;

            alert('✅ Factura actualizada correctamente');
            onSuccess?.();
        } catch (err: any) {
            console.error(err);
            alert('Error al actualizar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        clientId, setClientId,
        clinicId, setClinicId,
        treatmentId, setTreatmentId,
        items, addItem, removeItem, updateItem, setItems,
        notes, setNotes,
        hasInsurance, setHasInsurance,
        insuranceAmount, setInsuranceAmount,
        insuranceName, setInsuranceName,
        isFractional, setIsFractional,
        paymentPercent, setPaymentPercent,
        loading,
        submitInvoice,
        updateInvoice,
        loadInvoice,
        subtotal,
        invoiceAmount,
        afterInsurance,
        resetForm
    };
};
