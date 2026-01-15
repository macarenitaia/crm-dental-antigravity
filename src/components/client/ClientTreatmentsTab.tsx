import React from 'react';
import { Treatment } from '@/hooks/useClientProfile';
import { Plus, FileText } from 'lucide-react';

interface ClientTreatmentsTabProps {
    treatments: Treatment[];
    onNewQuote: () => void;
    onInvoice: (treatmentId: string) => void;
}

export const ClientTreatmentsTab: React.FC<ClientTreatmentsTabProps> = ({ treatments, onNewQuote, onInvoice }) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Planes de Tratamiento</h3>
                    <p className="text-sm text-gray-500">Presupuestos y procedimientos</p>
                </div>
                <button
                    onClick={onNewQuote}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-100 transition-all text-xs font-black uppercase tracking-widest"
                >
                    <Plus size={16} /> Crear Tratamiento
                </button>
            </div>

            {treatments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay tratamientos registrados</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {treatments.map(t => (
                        <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg mb-1">{t.description || 'Tratamiento sin nombre'}</h4>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md uppercase font-black tracking-widest">
                                            {t.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-emerald-600 flex items-center justify-end">
                                        <span className="mr-0.5">€</span>
                                        {t.cost?.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 mb-3">Presupuesto</div>
                                    <button
                                        onClick={() => onInvoice(t.id)}
                                        className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                    >
                                        Facturar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
