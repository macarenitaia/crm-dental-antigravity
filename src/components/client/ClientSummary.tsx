import React from 'react';
import { User, Phone, Mail, MapPin, Calendar, CreditCard, Droplet, Users, HeartPulse, Stethoscope, AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Client } from '@/types';

interface ClientSummaryProps {
    client: Client;
    lastAppointment: Date | null;
    nextAppointment: Date | null;
    totalTreatments: number;
}

export const ClientSummary: React.FC<ClientSummaryProps> = ({ client, lastAppointment, nextAppointment, totalTreatments }) => {
    // Helper to calculate age
    const calculateAge = (dobString?: string) => {
        if (!dobString) return 'N/A';
        const dob = new Date(dobString);
        const diff = Date.now() - dob.getTime();
        const ageDate = new Date(diff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden h-fit sticky top-6">
            <div className="bg-gradient-to-b from-emerald-50/50 to-white pt-10 pb-6 px-6 flex flex-col items-center border-b border-gray-100">
                <div className="relative mb-4 group">
                    <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-3xl font-bold border-4 border-white shadow-lg overflow-hidden relative">
                        {client.image_url ? (
                            <img src={client.image_url} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>{client.name.substring(0, 2).toUpperCase()}</span>
                        )}
                    </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-1">{client.name}</h2>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                    Paciente Regular
                </span>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} /> Información Personal
                    </h3>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600 group hover:text-blue-600 transition-colors cursor-pointer p-2 hover:bg-gray-50 rounded-lg -mx-2">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Users size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Edad / Género</p>
                                <p className="font-medium">{calculateAge(client.date_of_birth)} años • {client.gender || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600 group hover:text-blue-600 transition-colors cursor-pointer p-2 hover:bg-gray-50 rounded-lg -mx-2">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Phone size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Teléfono</p>
                                <p className="font-medium">{client.phone || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600 group hover:text-blue-600 transition-colors cursor-pointer p-2 hover:bg-gray-50 rounded-lg -mx-2">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                <Mail size={16} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Email</p>
                                <p className="font-medium truncate max-w-[180px]">{client.email || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <HeartPulse size={14} /> Historial Médico
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                            <div className="text-emerald-600 text-xs font-medium mb-1">Citas</div>
                            <div className="text-emerald-900 font-bold text-lg">0</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <div className="text-blue-600 text-xs font-medium mb-1">Tratamientos</div>
                            <div className="text-blue-900 font-bold text-lg">{totalTreatments}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
