
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { Building, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface Clinic {
    id: string;
    name: string;
    address: string;
    created_at: string;
}

export default function SettingsPage() {
    const { tenantId, user } = useTenant();
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

    // Form State
    const [formName, setFormName] = useState('');
    const [formAddress, setFormAddress] = useState('');

    useEffect(() => {
        if (tenantId) {
            fetchClinics();
        }
    }, [tenantId]);

    async function fetchClinics() {
        if (!tenantId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('cliente_id', tenantId) // Filter by tenant!
            .order('created_at', { ascending: true });
        if (data) setClinics(data);
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!window.confirm('¿Seguro que quieres eliminar esta sede?')) return;
        const { error } = await supabase.from('clinics').delete().eq('id', id);
        if (!error) fetchClinics();
        else alert('Error al eliminar: ' + error.message);
    }

    function openAdd() {
        setEditingClinic(null);
        setFormName('');
        setFormAddress('');
        setIsModalOpen(true);
    }

    function openEdit(clinic: Clinic) {
        setEditingClinic(clinic);
        setFormName(clinic.name);
        setFormAddress(clinic.address);
        setIsModalOpen(true);
    }

    async function handleSave() {
        if (!formName) return alert('El nombre es obligatorio');
        if (!tenantId) return alert('Error: No se pudo determinar su clínica');

        try {
            if (editingClinic) {
                // Update
                const { error } = await supabase
                    .from('clinics')
                    .update({ name: formName, address: formAddress })
                    .eq('id', editingClinic.id);
                if (error) throw error;
            } else {
                // Insert with tenantId
                const { error } = await supabase
                    .from('clinics')
                    .insert({ name: formName, address: formAddress, cliente_id: tenantId });
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchClinics();
        } catch (error: any) {
            alert('Error guardando: ' + error.message);
        }
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar is in layout */}
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Building className="text-emerald-600" />
                            Configuración de Sedes
                        </h1>
                        <p className="text-gray-500 mt-2">Gestiona las ubicaciones de tus clínicas aquí.</p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Nueva Sede
                    </button>
                </header>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Cargando sedes...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {clinics.map(clinic => (
                            <div key={clinic.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(clinic)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(clinic.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <h3 className="text-xl font-semibold text-gray-800 mb-1">{clinic.name}</h3>
                                <p className="text-gray-500 text-sm flex items-start gap-1">
                                    <Building size={14} className="mt-0.5" />
                                    {clinic.address || 'Sin dirección'}
                                </p>
                                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                    <span>ID: {clinic.id.slice(0, 8)}...</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">{editingClinic ? 'Editar Sede' : 'Añadir Nueva Sede'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Ej: Sede Centro"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Física</label>
                                    <input
                                        type="text"
                                        value={formAddress}
                                        onChange={e => setFormAddress(e.target.value)}
                                        placeholder="Ej: Calle Gran Vía, 42"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center gap-2"
                                >
                                    <Save size={18} />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
