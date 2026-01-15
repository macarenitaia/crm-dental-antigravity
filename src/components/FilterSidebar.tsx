"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, UserCog, Stethoscope, ChevronDown, Check, X, RotateCcw } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface FilterOption {
    id: string;
    label: string;
}

interface FilterSidebarProps {
    onFilterChange: (filters: {
        clinicId?: string;
        doctorId?: string;
        treatmentId?: string;
    }) => void;
}

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
    const { tenantId } = useTenant();

    // --- STATE ---
    const [clinics, setClinics] = useState<FilterOption[]>([]);
    const [doctors, setDoctors] = useState<FilterOption[]>([]);
    const [treatments, setTreatments] = useState<FilterOption[]>([]);

    const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
    const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);

    // --- FETCH DATA (filtered by tenant) ---
    useEffect(() => {
        if (!tenantId) return;

        const fetchFilters = async () => {
            // 1. Clinics for this tenant
            const { data: clinicsData } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('cliente_id', tenantId);
            if (clinicsData) setClinics(clinicsData.map(c => ({ id: c.id, label: c.name })));

            // 2. Doctors for this tenant (using new 'doctors' table)
            const { data: doctorsData } = await supabase
                .from('doctors')
                .select('id, name')
                .eq('cliente_id', tenantId)
                .eq('is_active', true);
            if (doctorsData) setDoctors(doctorsData.map(d => ({ id: d.id, label: d.name })));

            // 3. Treatments for this tenant
            const { data: treatmentsData } = await supabase
                .from('tratamientos_new')
                .select('id, nombre')
                .eq('cliente_id', tenantId);
            if (treatmentsData) setTreatments(treatmentsData.map(t => ({ id: t.id, label: t.nombre })));
        };

        fetchFilters();
    }, [tenantId]);

    // --- APPLY FILTERS ---
    const handleSearch = () => {
        onFilterChange({
            clinicId: selectedClinic || undefined,
            doctorId: selectedDoctor || undefined,
            treatmentId: selectedTreatment || undefined
        });
    };

    const handleReset = () => {
        setSelectedClinic(null);
        setSelectedDoctor(null);
        setSelectedTreatment(null);
        onFilterChange({});
    };

    return (
        <div className="w-[300px] border-r border-gray-200 bg-white h-full flex flex-col pt-8 pb-4 px-6 overflow-y-auto font-sans">
            <h2 className="text-xl font-bold text-gray-900 mb-8">Filtros avanzados</h2>

            <div className="space-y-8 flex-1">
                {/* 1. LOCAL / SEDE */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400" />
                        Local / Sede
                    </label>
                    <CustomSelect
                        placeholder="Selecciona..."
                        options={clinics}
                        value={selectedClinic}
                        onChange={setSelectedClinic}
                    />
                </div>

                {/* 2. PROFESIONAL / PRESTADOR */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <UserCog size={16} className="text-gray-400" />
                        Profesional / Doctor
                    </label>
                    <CustomSelect
                        placeholder="Selecciona..."
                        options={doctors}
                        value={selectedDoctor}
                        onChange={setSelectedDoctor}
                    />
                </div>

                {/* 3. SERVICIOS */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Stethoscope size={16} className="text-gray-400" />
                        Servicio
                    </label>
                    <CustomSelect
                        placeholder="Selecciona..."
                        options={treatments}
                        value={selectedTreatment}
                        onChange={setSelectedTreatment}
                    />
                </div>

            </div>

            {/* BUTTONS */}
            <div className="mt-8 pt-4 border-t border-gray-100 space-y-3">
                <button
                    onClick={handleSearch}
                    className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                    Buscar
                </button>
                <button
                    onClick={handleReset}
                    className="w-full text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-2"
                >
                    <RotateCcw size={14} /> Reestablecer filtros
                </button>
            </div>
        </div>
    );
}

// --- HELPER COMPONENTS ---

function CustomSelect({ placeholder, options, value, onChange }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedLabel = options.find((o: any) => o.id === value)?.label;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left bg-white border ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'} rounded-lg py-3 px-4 flex justify-between items-center transition-all shadow-sm group hover:border-gray-300`}
            >
                <span className={`text-sm ${selectedLabel ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : 'group-hover:text-gray-600'}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                        {options.map((opt: any) => (
                            <div
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                className="px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer text-sm text-gray-700 flex items-center justify-between"
                            >
                                {opt.label}
                                {value === opt.id && <Check size={14} className="text-emerald-600" />}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function CollapsibleFilter({ label }: { label: string }) {
    return (
        <div className="py-3 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg group">
            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{label}</span>
            <span className="text-gray-400 font-light text-xl">+</span>
        </div>
    );
}
