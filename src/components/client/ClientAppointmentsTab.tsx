import React from 'react';
import { Appointment } from '@/types';
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ClientAppointmentsTabProps {
    appointments: Appointment[];
    onNewAppointment: () => void;
}

export const ClientAppointmentsTab: React.FC<ClientAppointmentsTabProps> = ({ appointments, onNewAppointment }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'completed': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
            case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-amber-600 bg-amber-50 border-amber-100';
        }
    };
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <CheckCircle size={14} />;
            case 'completed': return <CheckCircle size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Citas</h3>
                    <p className="text-gray-500 font-medium">Historial de citas y próximas visitas</p>
                </div>
                <button
                    onClick={onNewAppointment}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-100 transition-all text-xs font-black uppercase tracking-widest active:scale-95"
                >
                    <Calendar size={16} /> Crear Cita
                </button>
            </div>

            {appointments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay citas registradas</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {[...appointments]
                        .sort((a, b) => {
                            const now = new Date().getTime();
                            const aTime = new Date(a.start_time).getTime();
                            const bTime = new Date(b.start_time).getTime();

                            const aIsFuture = aTime >= now && a.status !== 'cancelled';
                            const bIsFuture = bTime >= now && b.status !== 'cancelled';

                            // 1. Future appointments first
                            if (aIsFuture && !bIsFuture) return -1;
                            if (!aIsFuture && bIsFuture) return 1;

                            // 2. Both are future: sort ASC (closest first)
                            if (aIsFuture && bIsFuture) return aTime - bTime;

                            // 3. Both are past: sort DESC (most recent first)
                            return bTime - aTime;
                        })
                        .map(app => (
                            <div key={app.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(app.status)}`}>
                                        <span className="text-lg font-bold">{new Date(app.start_time).toLocaleDateString('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' })}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{new Date(app.start_time).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })}</h4>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} /> {new Date(app.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })}
                                            </span>
                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(app.status)}`}>
                                                {getStatusIcon(app.status)}
                                                <span className="uppercase">{app.status}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};
