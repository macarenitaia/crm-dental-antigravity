"use client";

import { X, Plus, Receipt } from 'lucide-react';
import { PatientTreatment } from '@/types';
import { useTreatment } from '@/hooks/useTreatment';
import { TreatmentCreateForm } from './treatments/TreatmentCreateForm';
import { TreatmentDetailsView } from './treatments/TreatmentDetailsView';

interface TreatmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    tenantId: string;
    treatment?: PatientTreatment | null;
    mode: 'create' | 'view';
    onSuccess?: () => void;
}

export default function TreatmentModal({
    isOpen,
    onClose,
    clientId,
    tenantId,
    treatment,
    mode,
    onSuccess
}: TreatmentModalProps) {

    // Hook handles all logic
    const {
        form, setForm,
        doctors, treatmentTypes,
        phases, payments,
        loading,
        handleCreate,
        handleInvoice
    } = useTreatment(mode, treatment || null, onSuccess, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'create' ? 'Nuevo Tratamiento' : treatment?.name}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {mode === 'create' ? (
                        <TreatmentCreateForm
                            form={form}
                            setForm={setForm}
                            treatmentTypes={treatmentTypes}
                            doctors={doctors}
                        />
                    ) : (treatment && (
                        <TreatmentDetailsView
                            treatment={treatment}
                            payments={payments}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cerrar
                    </button>

                    {mode === 'create' ? (
                        <button
                            onClick={() => handleCreate(clientId)}
                            disabled={loading}
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Plus size={18} />
                            {loading ? 'Guardando...' : 'Crear Tratamiento'}
                        </button>
                    ) : treatment && treatment.invoiced_amount < treatment.budget_amount && treatment.status !== 'quoted' ? (
                        <button
                            onClick={handleInvoice}
                            disabled={loading}
                            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Receipt size={18} />
                            {loading ? 'Generando...' : 'Generar Factura'}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
