"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Stethoscope, AlertCircle } from 'lucide-react';

interface NewHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    tenantId: string;
    doctors: { id: string, name: string }[];
    onSuccess: () => void;
}

export default function NewHistoryModal({ isOpen, onClose, clientId, tenantId, doctors, onSuccess }: NewHistoryModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [doctorId, setDoctorId] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [treatment, setTreatment] = useState('');
    const [observations, setObservations] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('clinical_history')
                .insert({
                    client_id: clientId,
                    cliente_id: tenantId,
                    date: date,
                    doctor_id: doctorId || null,
                    diagnosis,
                    treatment,
                    observations
                });

            if (insertError) throw insertError;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error saving history:', err);
            setError(err.message || 'Error al guardar la entrada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-emerald-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                            <Stethoscope size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Nueva Entrada Clínica</h2>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Registro de evolución</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-colors shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 flex items-start gap-3">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Doctor</label>
                            <select
                                value={doctorId}
                                onChange={(e) => setDoctorId(e.target.value)}
                                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none appearance-none"
                            >
                                <option value="">Seleccionar doctor...</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Nombre del Tratamiento / Motivo</label>
                        <input
                            type="text"
                            value={treatment}
                            onChange={(e) => setTreatment(e.target.value)}
                            placeholder="Ej: Limpieza dental, Endodoncia..."
                            required
                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Diagnóstico / Evolución</label>
                        <textarea
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Escribe el diagnóstico detallado..."
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Observaciones (Opcional)</label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Notas adicionales..."
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none italic"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-6 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 px-6 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200 transition-all text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar Entrada
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
