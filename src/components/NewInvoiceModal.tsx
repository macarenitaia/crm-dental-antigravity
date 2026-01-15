"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Building, User, Receipt, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CustomSelect from './ui/CustomSelect';
import { useInvoiceForm } from '@/hooks/useInvoiceForm';

interface NewInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    onSuccess?: () => void;
    initialTreatmentId?: string | null;
    initialInvoice?: any | null;
}

export default function NewInvoiceModal({ isOpen, onClose, tenantId, onSuccess, initialTreatmentId, initialInvoice }: NewInvoiceModalProps) {
    // Options State (Can be moved to hook or context if needed globally)
    const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
    const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
    const [treatments, setTreatments] = useState<{ id: string; name: string; budget_amount: number; client_id: string }[]>([]);

    // Use Hook
    const invoice = useInvoiceForm(() => {
        onSuccess?.();
        onClose();
    });

    useEffect(() => {
        if (isOpen && tenantId) {
            fetchOptions();
        }
    }, [isOpen, tenantId]);

    // Auto-select treatment when options load
    useEffect(() => {
        if (isOpen && initialTreatmentId && treatments.length > 0) {
            handleTreatmentSelect(initialTreatmentId);
        }
    }, [isOpen, initialTreatmentId, treatments.length]);

    // Load initial invoice for editing
    useEffect(() => {
        if (isOpen) {
            if (initialInvoice) {
                invoice.loadInvoice(initialInvoice);
            } else if (!initialTreatmentId) {
                invoice.resetForm();
            }
        } else {
            // Reset when closing to avoid bleeding state
            invoice.resetForm();
        }
    }, [isOpen, initialInvoice, initialTreatmentId]);

    // Auto-populate items from treatment if they are missing (e.g. initial Rectify load)
    useEffect(() => {
        if (isOpen && invoice.treatmentId && treatments.length > 0) {
            // Check if we already have items with description and price
            const hasRealItems = invoice.items.some(it => it.description.trim() !== '' && it.total > 0);
            if (!hasRealItems) {
                const treatment = treatments.find(t => t.id === invoice.treatmentId);
                if (treatment) {
                    invoice.setItems([{
                        description: treatment.name,
                        quantity: 1,
                        unitPrice: treatment.budget_amount,
                        total: treatment.budget_amount
                    }]);
                }
            }
        }
    }, [isOpen, invoice.treatmentId, treatments.length, initialInvoice]); // Only run when modal opens, treatment changes, or initialInvoice changes

    async function fetchOptions() {
        // Parallel fetch
        const [clientsRes, clinicsRes, treatmentsRes] = await Promise.all([
            supabase.from('clients').select('id, name').eq('cliente_id', tenantId).eq('status', 'client').order('name'),
            supabase.from('clinics').select('id, name').eq('tenant_id', tenantId),
            supabase.from('patient_treatments').select('id, name, budget_amount, client_id').eq('cliente_id', tenantId)
        ]);

        if (treatmentsRes.data) setTreatments(treatmentsRes.data);
        if (clientsRes.data) setClients(clientsRes.data);
        if (clinicsRes.data) setClinics(clinicsRes.data);
    }

    // Filtered treatments - Always filter by client if selected
    const clientTreatments = treatments.filter(t => !invoice.clientId || t.client_id === invoice.clientId);

    const handleTreatmentSelect = (tId: string) => {
        invoice.setTreatmentId(tId);
        const treatment = treatments.find(t => t.id === tId);
        if (treatment && !invoice.clientId) {
            invoice.setClientId(treatment.client_id);
        }
        if (treatment) {
            invoice.setItems([{
                description: treatment.name,
                quantity: 1,
                unitPrice: treatment.budget_amount,
                total: treatment.budget_amount
            }]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Receipt size={20} />
                        {initialInvoice ? `Rectificar Factura ${initialInvoice.invoice_number}` : 'Nueva Factura (Optimizada)'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Patient & Clinic Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <User size={14} /> Paciente *
                            </label>
                            <CustomSelect
                                value={invoice.clientId}
                                onChange={invoice.setClientId}
                                options={clients.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="Seleccionar paciente"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Building size={14} /> Sede
                            </label>
                            <CustomSelect
                                value={invoice.clinicId}
                                onChange={invoice.setClinicId}
                                options={[
                                    { value: '', label: 'Sin sede específica' },
                                    ...clinics.map(c => ({ value: c.id, label: c.name }))
                                ]}
                                placeholder="Seleccionar sede"
                            />
                        </div>
                    </div>

                    {/* Treatment selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vincular a Tratamiento (opcional)
                        </label>
                        <CustomSelect
                            value={invoice.treatmentId}
                            onChange={handleTreatmentSelect}
                            options={[
                                { value: '', label: 'Sin tratamiento vinculado' },
                                ...clientTreatments.map(t => ({
                                    value: t.id,
                                    label: `${t.name} - €${t.budget_amount}`
                                }))
                            ]}
                            placeholder="Seleccionar tratamiento"
                            disabled={!invoice.clientId && clientTreatments.length === 0}
                        />
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-gray-700">Conceptos</label>
                            <button
                                onClick={invoice.addItem}
                                className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                                <Plus size={14} /> Añadir línea
                            </button>
                        </div>
                        <div className="space-y-2">
                            {invoice.items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="Descripción"
                                        value={item.description}
                                        onChange={e => invoice.updateItem(idx, 'description', e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Cant."
                                        value={item.quantity || ''}
                                        onChange={e => invoice.updateItem(idx, 'quantity', e.target.value)}
                                        className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center"
                                        min="1"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Precio"
                                        value={item.unitPrice || ''}
                                        onChange={e => invoice.updateItem(idx, 'unitPrice', e.target.value)}
                                        className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right"
                                        step="0.01"
                                    />
                                    <span className="w-20 text-right font-medium text-gray-900">
                                        €{item.total.toFixed(2)}
                                    </span>
                                    {invoice.items.length > 1 && (
                                        <button onClick={() => invoice.removeItem(idx)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Insurance section */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={invoice.hasInsurance}
                                onChange={e => invoice.setHasInsurance(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <CreditCard size={16} className="text-blue-600" />
                            <span className="text-sm font-medium text-blue-700">Pago con aseguradora</span>
                        </label>

                        {invoice.hasInsurance && (
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-blue-600 mb-1">Nombre aseguradora</label>
                                    <input
                                        type="text"
                                        value={invoice.insuranceName}
                                        onChange={e => invoice.setInsuranceName(e.target.value)}
                                        placeholder="Ej: Sanitas, Adeslas..."
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-blue-600 mb-1">Importe que paga la aseguradora</label>
                                    <input
                                        type="number"
                                        value={invoice.insuranceAmount || ''}
                                        onChange={e => invoice.setInsuranceAmount(Number(e.target.value))}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fractional Payment section */}
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={invoice.isFractional}
                                onChange={e => invoice.setIsFractional(e.target.checked)}
                                className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span className="text-sm font-medium text-amber-700">💳 Pago fraccionado</span>
                        </label>

                        {invoice.isFractional && (
                            <div className="mt-3">
                                <label className="block text-xs text-amber-600 mb-2">Porcentaje a facturar ahora</label>
                                <div className="flex gap-2">
                                    {[25, 50, 75, 100].map(pct => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => invoice.setPaymentPercent(pct)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${invoice.paymentPercent === pct
                                                ? 'bg-amber-500 text-white shadow-md'
                                                : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
                                                }`}
                                        >
                                            {pct}%
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-amber-600 mt-2">
                                    Facturando €{invoice.invoiceAmount.toFixed(2)} de €{invoice.afterInsurance.toFixed(2)} total
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                        <textarea
                            value={invoice.notes}
                            onChange={e => invoice.setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Subtotal</span>
                            <span>€{invoice.subtotal.toFixed(2)}</span>
                        </div>
                        {invoice.hasInsurance && invoice.insuranceAmount > 0 && (
                            <div className="flex justify-between text-sm text-blue-600 mb-2">
                                <span>Cubre aseguradora</span>
                                <span>-€{invoice.insuranceAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {invoice.isFractional && invoice.paymentPercent < 100 && (
                            <div className="flex justify-between text-sm text-amber-600 mb-2">
                                <span>Pago fraccionado ({invoice.paymentPercent}%)</span>
                                <span>€{invoice.invoiceAmount.toFixed(2)} de €{invoice.afterInsurance.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total esta factura</span>
                            <span>€{invoice.invoiceAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            if (initialInvoice) {
                                invoice.updateInvoice(initialInvoice.id);
                            } else {
                                invoice.submitInvoice();
                            }
                        }}
                        disabled={invoice.loading || !invoice.clientId}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50"
                    >
                        {invoice.loading ? (initialInvoice ? 'Guardando...' : 'Creando...') : (initialInvoice ? 'Guardar Cambios' : 'Crear Factura')}
                    </button>
                </div>
            </div>
        </div>
    );
}
