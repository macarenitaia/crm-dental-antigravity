import React from 'react';
import { TreatmentFormState } from '@/hooks/useTreatment';

interface TreatmentCreateFormProps {
    form: TreatmentFormState;
    setForm: (f: TreatmentFormState) => void;
    treatmentTypes: { id: string; nombre: string }[];
    doctors: { id: string; name: string }[];
}

export const TreatmentCreateForm: React.FC<TreatmentCreateFormProps> = ({ form, setForm, treatmentTypes, doctors }) => {
    return (
        <div className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del tratamiento *</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej: Implante dental, Ortodoncia..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    list="treatment-types"
                />
                <datalist id="treatment-types">
                    {treatmentTypes.map(t => <option key={t.id} value={t.nombre} />)}
                </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Piezas dentales</label>
                    <input
                        type="text"
                        value={form.toothNumbers}
                        onChange={e => setForm({ ...form, toothNumbers: e.target.value })}
                        placeholder="Ej: 14, 15 o Arcada superior"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Presupuesto (€) *</label>
                    <input
                        type="number"
                        value={form.budgetAmount}
                        onChange={e => setForm({ ...form, budgetAmount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor asignado</label>
                <select
                    value={form.doctorId}
                    onChange={e => setForm({ ...form, doctorId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">Sin asignar</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
                <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observaciones adicionales..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
            </div>
        </div>
    );
};
