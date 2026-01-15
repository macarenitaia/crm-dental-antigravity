import React, { useState } from 'react';
import { ClinicalHistory } from '@/hooks/useClientProfile';
import { Stethoscope, Clock, User as UserIcon, Plus } from 'lucide-react';

interface ClientHistoryTabProps {
    history: ClinicalHistory[];
    onAddEntry: () => void;
}

export const ClientHistoryTab: React.FC<ClientHistoryTabProps> = ({ history, onAddEntry }) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Historial Clínico</h3>
                    <p className="text-sm text-gray-500">Registro evolutivo del paciente</p>
                </div>
                <button
                    onClick={onAddEntry}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-100 transition-all text-xs font-black uppercase tracking-widest"
                >
                    <Plus size={16} /> Nueva Entrada
                </button>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Stethoscope size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Sin historial clínico</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">
                        No hay registros médicos para este paciente. Comienza añadiendo una nueva entrada evolutiva.
                    </p>
                </div>
            ) : (
                <div className="space-y-0 relative before:absolute before:left-8 before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-100">
                    {history.map((entry, idx) => (
                        <div key={entry.id || idx} className="relative pl-20 pb-8 last:pb-0 group">
                            {/* Timeline Node */}
                            <div className="absolute left-[22px] top-0 w-11 h-11 bg-white border-4 border-emerald-50 rounded-full flex items-center justify-center z-10 shadow-sm group-hover:border-emerald-100 group-hover:scale-110 transition-all duration-300">
                                <Stethoscope size={18} className="text-emerald-600" />
                            </div>

                            {/* Date Badge */}
                            <div className="absolute left-0 top-12 flex flex-col items-center w-[55px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString([], { month: 'short' })}</span>
                                <span className="text-lg font-bold text-gray-700 leading-none">{new Date(entry.date).getDate()}</span>
                                <span className="text-[10px] text-gray-400">{new Date(entry.date).getFullYear()}</span>
                            </div>

                            {/* Content Card */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group-hover:border-emerald-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent opacity-50 rounded-bl-full pointer-events-none" />

                                <div className="flex items-start justify-between mb-4 relative">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1">{entry.treatment || 'Consulta General'}</h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                                <UserIcon size={12} /> Dr. {entry.doctors?.name || 'No asignado'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} /> {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">
                                        Evolución
                                    </span>
                                </div>

                                <div className="space-y-3 relative">
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Diagnóstico</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {entry.diagnosis}
                                        </p>
                                    </div>

                                    {entry.observations && (
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Observaciones</p>
                                            <p className="text-sm text-gray-600 italic">
                                                {entry.observations}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
