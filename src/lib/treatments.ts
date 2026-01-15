/**
 * TREATMENTS LIBRARY
 * ==================
 * CRUD operations for patient treatments with billing integration
 */

import { supabase } from './supabase';
import { PatientTreatment, TreatmentPhase } from '@/types';

// =====================================================
// PATIENT TREATMENTS CRUD
// =====================================================

export async function getTreatmentsByClient(clientId: string, tenantId: string) {
    const { data, error } = await supabase
        .from('patient_treatments')
        .select(`
            *,
            doctor:doctors(id, name, specialty),
            clinic:clinics(id, name)
        `)
        .eq('client_id', clientId)
        .eq('cliente_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PatientTreatment[];
}

export async function getTreatmentById(treatmentId: string) {
    const { data, error } = await supabase
        .from('patient_treatments')
        .select(`
            *,
            doctor:doctors(id, name, specialty),
            clinic:clinics(id, name),
            phases:treatment_phases(*)
        `)
        .eq('id', treatmentId)
        .single();

    if (error) throw error;
    return data;
}

export async function createTreatment(treatment: {
    clientId: string;
    tenantId: string;
    name: string;
    toothNumbers?: string;
    budgetAmount: number;
    doctorId?: string;
    clinicId?: string;
    treatmentTypeId?: string;
    notes?: string;
    startDate?: string;
    estimatedEndDate?: string;
}) {
    const { data, error } = await supabase
        .from('patient_treatments')
        .insert({
            cliente_id: treatment.tenantId,
            client_id: treatment.clientId,
            name: treatment.name,
            tooth_numbers: treatment.toothNumbers,
            budget_amount: treatment.budgetAmount,
            doctor_id: treatment.doctorId,
            clinic_id: treatment.clinicId,
            treatment_type_id: treatment.treatmentTypeId,
            notes: treatment.notes,
            start_date: treatment.startDate,
            estimated_end_date: treatment.estimatedEndDate,
            status: 'quoted'
        })
        .select()
        .single();

    if (error) throw error;

    // Auto-create a default phase
    await supabase.from('treatment_phases').insert({
        treatment_id: data.id,
        cliente_id: treatment.tenantId,
        name: 'Tratamiento completo',
        amount: treatment.budgetAmount,
        phase_order: 1,
        status: 'pending'
    });

    return data as PatientTreatment;
}

export async function updateTreatmentStatus(
    treatmentId: string,
    status: PatientTreatment['status']
) {
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'accepted') {
        updates.budget_accepted_at = new Date().toISOString();
    } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('patient_treatments')
        .update(updates)
        .eq('id', treatmentId)
        .select()
        .single();

    if (error) throw error;
    return data as PatientTreatment;
}

export async function deleteTreatment(treatmentId: string) {
    // Only allow deletion of quoted treatments
    const { data: treatment } = await supabase
        .from('patient_treatments')
        .select('status, invoiced_amount')
        .eq('id', treatmentId)
        .single();

    if (treatment?.invoiced_amount > 0) {
        throw new Error('No se puede eliminar un tratamiento ya facturado');
    }

    if (treatment?.status !== 'quoted') {
        throw new Error('Solo se pueden eliminar tratamientos en estado "Presupuestado"');
    }

    const { error } = await supabase
        .from('patient_treatments')
        .delete()
        .eq('id', treatmentId);

    if (error) throw error;
}

// =====================================================
// TREATMENT PHASES
// =====================================================

export async function getPhasesByTreatment(treatmentId: string) {
    const { data, error } = await supabase
        .from('treatment_phases')
        .select('*')
        .eq('treatment_id', treatmentId)
        .order('phase_order');

    if (error) throw error;
    return data as TreatmentPhase[];
}

export async function createPhase(phase: {
    treatmentId: string;
    tenantId: string;
    name: string;
    amount: number;
    description?: string;
}) {
    // Get next phase order
    const { data: existing } = await supabase
        .from('treatment_phases')
        .select('phase_order')
        .eq('treatment_id', phase.treatmentId)
        .order('phase_order', { ascending: false })
        .limit(1);

    const nextOrder = (existing?.[0]?.phase_order || 0) + 1;

    const { data, error } = await supabase
        .from('treatment_phases')
        .insert({
            treatment_id: phase.treatmentId,
            cliente_id: phase.tenantId,
            name: phase.name,
            amount: phase.amount,
            description: phase.description,
            phase_order: nextOrder,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;
    return data as TreatmentPhase;
}

// =====================================================
// BILLING INTEGRATION
// =====================================================

export async function createInvoiceFromTreatment(
    treatmentId: string,
    tenantId: string,
    phaseId?: string
) {
    // Get treatment details
    const { data: treatment } = await supabase
        .from('patient_treatments')
        .select('*, clinic:clinics(id, name)')
        .eq('id', treatmentId)
        .single();

    if (!treatment) throw new Error('Tratamiento no encontrado');

    let amount = treatment.budget_amount;
    let description = treatment.name;

    // If phase specified, use phase amount
    if (phaseId) {
        const { data: phase } = await supabase
            .from('treatment_phases')
            .select('*')
            .eq('id', phaseId)
            .single();

        if (phase) {
            amount = phase.amount;
            description = `${treatment.name} - ${phase.name}`;
        }
    }

    // Generate invoice number
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;

    const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('cliente_id', tenantId)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

    let nextNum = 1;
    if (lastInvoice && lastInvoice.length > 0) {
        const lastNum = parseInt(lastInvoice[0].invoice_number.split('-').pop() || '0');
        nextNum = lastNum + 1;
    }

    const invoiceNumber = `${prefix}${nextNum.toString().padStart(5, '0')}`;

    // Create invoice
    const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
            invoice_number: invoiceNumber,
            cliente_id: tenantId,
            client_id: treatment.client_id,
            treatment_id: treatmentId,
            phase_id: phaseId || null,
            clinic_id: treatment.clinic_id,
            subtotal: amount,
            tax_rate: 0,
            tax_amount: 0,
            total: amount,
            paid_amount: amount,
            status: 'paid',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

    if (error) throw error;

    // Create invoice item
    await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: description,
        treatment_type: treatment.name,
        quantity: 1,
        unit_price: amount,
        total: amount,
        sort_order: 0
    });

    // Record Payment
    await supabase.from('payments').insert({
        invoice_id: invoice.id,
        cliente_id: tenantId,
        amount: amount,
        method: 'other',
        notes: 'Pago automático (Quick Invoice)'
    });

    // Update phase status if applicable
    if (phaseId) {
        await supabase
            .from('treatment_phases')
            .update({ status: 'invoiced', invoice_id: invoice.id })
            .eq('id', phaseId);
    }

    // Update treatment invoiced amount
    await supabase
        .from('patient_treatments')
        .update({
            invoiced_amount: treatment.invoiced_amount + amount,
            updated_at: new Date().toISOString()
        })
        .eq('id', treatmentId);

    return invoice;
}

// =====================================================
// ACCOUNT BALANCES (Entregas a Cuenta)
// =====================================================

export async function getClientBalance(clientId: string, tenantId: string) {
    const { data } = await supabase
        .from('account_balances')
        .select('balance_after')
        .eq('client_id', clientId)
        .eq('cliente_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);

    return data?.[0]?.balance_after || 0;
}

export async function addDeposit(
    clientId: string,
    tenantId: string,
    amount: number,
    description?: string
) {
    const currentBalance = await getClientBalance(clientId, tenantId);
    const newBalance = currentBalance + amount;

    const { data, error } = await supabase
        .from('account_balances')
        .insert({
            cliente_id: tenantId,
            client_id: clientId,
            type: 'deposit',
            amount: amount,
            description: description || 'Entrega a cuenta',
            balance_after: newBalance
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function useBalance(
    clientId: string,
    tenantId: string,
    amount: number,
    invoiceId: string
) {
    const currentBalance = await getClientBalance(clientId, tenantId);

    if (amount > currentBalance) {
        throw new Error('Saldo insuficiente');
    }

    const newBalance = currentBalance - amount;

    const { data, error } = await supabase
        .from('account_balances')
        .insert({
            cliente_id: tenantId,
            client_id: clientId,
            type: 'usage',
            amount: -amount,
            description: 'Aplicación a factura',
            invoice_id: invoiceId,
            balance_after: newBalance
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}
