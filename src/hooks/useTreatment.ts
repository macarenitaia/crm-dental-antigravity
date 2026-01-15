import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PatientTreatment, TreatmentPhase } from '@/types';
import { createTreatment, getPhasesByTreatment, createInvoiceFromTreatment } from '@/lib/treatments';
import { useTenant } from '@/contexts/TenantContext';

export interface TreatmentFormState {
    name: string;
    toothNumbers: string;
    budgetAmount: string; // string for input
    doctorId: string;
    notes: string;
}

export const useTreatment = (
    mode: 'create' | 'view',
    treatment: PatientTreatment | null,
    onSuccess?: () => void,
    onClose?: () => void
): any => {
    const { tenantId } = useTenant();
    const [loading, setLoading] = useState(false);

    // Options
    const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
    const [treatmentTypes, setTreatmentTypes] = useState<{ id: string; nombre: string }[]>([]);

    // View Mode Data
    const [phases, setPhases] = useState<TreatmentPhase[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Create Form State
    const [form, setForm] = useState<TreatmentFormState>({
        name: '',
        toothNumbers: '',
        budgetAmount: '',
        doctorId: '',
        notes: ''
    });

    const fetchOptions = useCallback(async () => {
        if (!tenantId) return;
        const [docs, types] = await Promise.all([
            supabase.from('doctors').select('id, name').eq('cliente_id', tenantId).eq('is_active', true),
            supabase.from('tratamientos_new').select('id, nombre').eq('cliente_id', tenantId)
        ]);
        if (docs.data) setDoctors(docs.data);
        if (types.data) setTreatmentTypes(types.data);
    }, [tenantId]);

    const fetchDetails = useCallback(async () => {
        if (!treatment) return;

        // Parallel fetch phases and invoices
        const [phasesData, invoicesRes] = await Promise.all([
            getPhasesByTreatment(treatment.id),
            supabase.from('invoices').select('id').eq('treatment_id', treatment.id)
        ]);

        setPhases(phasesData);

        if (invoicesRes.data && invoicesRes.data.length > 0) {
            const ids = invoicesRes.data.map(i => i.id);
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('*')
                .in('invoice_id', ids)
                .order('payment_date', { ascending: true });
            if (paymentsData) setPayments(paymentsData);
        }
    }, [treatment]);

    // Initial Load
    useEffect(() => {
        fetchOptions();
        if (mode === 'view' && treatment) {
            fetchDetails();
        }
    }, [fetchOptions, fetchDetails, mode, treatment]);

    const handleCreate = async (clientId: string) => {
        if (!tenantId) return;
        if (!form.name || !form.budgetAmount) {
            alert('Por favor, completa el nombre y el presupuesto');
            return;
        }

        setLoading(true);
        try {
            await createTreatment({
                clientId,
                tenantId,
                name: form.name,
                toothNumbers: form.toothNumbers || undefined,
                budgetAmount: parseFloat(form.budgetAmount),
                doctorId: form.doctorId || undefined,
                notes: form.notes || undefined
            });
            onSuccess?.();
            onClose?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInvoice = async () => {
        if (!treatment || !tenantId) return;
        setLoading(true);
        try {
            await createInvoiceFromTreatment(treatment.id, tenantId);
            alert('Factura creada correctamente');
            onSuccess?.();
            onClose?.();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        form, setForm,
        doctors, treatmentTypes,
        phases, payments,
        loading,
        handleCreate,
        handleInvoice
    };
};
