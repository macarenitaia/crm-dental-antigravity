"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, User, Phone, Mail, Building2 } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface NewPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NewPatientModal({ isOpen, onClose, onSuccess }: NewPatientModalProps) {
    const { tenantId } = useTenant();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!tenantId) {
            setError('No se pudo determinar tu clínica. Por favor, vuelve a iniciar sesión.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: insertError } = await supabase
                .from('clients')
                .insert({
                    name,
                    whatsapp_id: phone,
                    email,
                    status: 'client',
                    cliente_id: tenantId // Use logged-in user's tenant!
                })
                .select();

            console.log('Insert result:', { data, insertError });

            if (insertError) {
                console.error('Insert error:', insertError);
                setError(insertError.message);
                setLoading(false);
                return;
            }

            // Success
            console.log('Patient created successfully');
            setName('');
            setPhone('');
            setEmail('');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Catch error:', err);
            setError(err.message || 'Error al crear paciente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Nuevo Paciente</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="María López García"
                                required
                                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Teléfono / WhatsApp</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+34 600 123 456"
                                required
                                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email (opcional)</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="paciente@email.com"
                                className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-emerald-600 text-white font-semibold rounded-xl shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Guardar'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
