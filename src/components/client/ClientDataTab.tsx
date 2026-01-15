import React, { useState } from 'react';
import { Client, ClientRelationship } from '@/types';
import { User, Phone, Mail, MapPin, Calendar, CreditCard, Save, Users, Plus, Trash2 } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

interface ClientDataTabProps {
    client: Client;
    lastAppointment: Date | null;
    onChange: (field: keyof Client, value: any) => void;
    onSave: () => void;
    relationships?: ClientRelationship[];
    potentialRelatives?: Client[];
    onRefreshRelationships?: () => void;
}

export const ClientDataTab: React.FC<ClientDataTabProps> = ({
    client, onChange, onSave,
    relationships = [],
    potentialRelatives = [],
    onRefreshRelationships
}) => {
    const { tenantId } = useTenant();
    const [selectedRelativeId, setSelectedRelativeId] = useState('');
    const [relationshipType, setRelationshipType] = useState('Hijo de');

    const handleAddRelationship = async () => {
        if (!selectedRelativeId || !tenantId) return;

        const { error } = await supabase
            .from('client_relationships')
            .insert({
                cliente_id: tenantId,
                client_id: client.id,
                related_client_id: selectedRelativeId,
                relationship_type: relationshipType
            });

        if (error) {
            alert('Error al añadir relación: ' + error.message);
        } else {
            setSelectedRelativeId('');
            onRefreshRelationships?.();
        }
    };

    const handleRemoveRelationship = async (id: string) => {
        if (!confirm('¿Eliminar esta relación?')) return;
        const { error } = await supabase
            .from('client_relationships')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Error al eliminar relación: ' + error.message);
        } else {
            onRefreshRelationships?.();
        }
    };

    return (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Datos Personales</h3>
                    <p className="text-gray-500 font-medium">Información de contacto y filiación</p>
                </div>
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-100 transition-all text-xs font-black uppercase tracking-widest active:scale-95"
                >
                    <Save size={16} /> Guardar Cambios
                </button>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={client.name}
                                onChange={(e) => onChange('name', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type="email"
                                value={client.email || ''}
                                onChange={(e) => onChange('email', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Teléfono</label>
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type="tel"
                                value={client.phone || ''}
                                onChange={(e) => onChange('phone', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fecha de Nacimiento</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type="date"
                                value={client.date_of_birth || ''}
                                onChange={(e) => onChange('date_of_birth', e.target.value)}
                                className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 accent-emerald-600"
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Género</label>
                        <CustomSelect
                            value={client.gender || ''}
                            onChange={(val) => onChange('gender', val)}
                            options={[
                                { value: 'Masculino', label: 'Masculino' },
                                { value: 'Femenino', label: 'Femenino' },
                                { value: 'Otro', label: 'Otro' }
                            ]}
                            placeholder="Seleccionar..."
                        />
                    </div>
                </div>
            </div>

            {/* Family Relationships */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Relaciones Familiares</h3>
                    <p className="text-gray-500 font-medium">Vincula este paciente con sus familiares en el sistema</p>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                    {/* Add Relationship */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Seleccionar Familiar</label>
                            <CustomSelect
                                options={potentialRelatives.map(r => ({ value: r.id, label: r.name }))}
                                value={selectedRelativeId}
                                onChange={setSelectedRelativeId}
                                placeholder="Buscar paciente..."
                            />
                        </div>
                        <div className="w-full md:w-60 space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Parentesco</label>
                            <CustomSelect
                                options={[
                                    { value: 'Hijo de', label: 'Hijo de' },
                                    { value: 'Padre de', label: 'Padre de' },
                                    { value: 'Madre de', label: 'Madre de' },
                                    { value: 'Hermano de', label: 'Hermano de' },
                                    { value: 'Cónyuge de', label: 'Cónyuge de' },
                                    { value: 'Familiar de', label: 'Familiar de' }
                                ]}
                                value={relationshipType}
                                onChange={setRelationshipType}
                            />
                        </div>
                        <button
                            onClick={handleAddRelationship}
                            disabled={!selectedRelativeId}
                            className="bg-emerald-600 text-white h-14 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto active:scale-95 shadow-lg shadow-emerald-100"
                        >
                            <Plus size={18} /> Añadir
                        </button>
                    </div>

                    {/* Existing Relationships */}
                    <div className="space-y-4 pt-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Familiares Vinculados</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {relationships.map((rel) => (
                                <div key={rel.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                            {rel.related_client?.name?.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{rel.related_client?.name}</p>
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{rel.relationship_type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRelationship(rel.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {relationships.length === 0 && (
                                <div className="md:col-span-2 text-center py-8 text-gray-400 italic text-sm">
                                    No hay familiares vinculados
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
