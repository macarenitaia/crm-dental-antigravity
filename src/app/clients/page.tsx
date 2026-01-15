"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Client, Appointment } from '@/types';
import { Search, Phone, MessageSquare, Plus, CheckCircle2, Clock, Settings, Upload } from 'lucide-react';
import ClientProfile from '@/components/ClientProfile';
import FilterSidebar from '@/components/FilterSidebar';
import NewPatientModal from '@/components/NewPatientModal';
import { useTenant } from '@/contexts/TenantContext';

type ExtendedAppointment = Appointment & {
    clients: Client;
};

export default function ClientsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClientsContent />
        </Suspense>
    );
}

function ClientsContent() {
    // Get tenant ID from context
    const { tenantId } = useTenant();
    const searchParams = useSearchParams();

    // State
    const [activeTab, setActiveTab] = useState<'todos' | 'hoy' | 'pendientes' | 'nuevos'>('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Filters
    const [filters, setFilters] = useState<{ clinicId?: string; doctorId?: string; treatmentId?: string }>({});

    // Modal
    const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

    // Data
    const [clients, setClients] = useState<Client[]>([]);
    const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Deep Link Handler
    useEffect(() => {
        const clientId = searchParams.get('clientId');
        if (clientId && !selectedClient) {
            const fetchClient = async () => {
                const { data } = await supabase.from('clients').select('*').eq('id', clientId).single();
                if (data) setSelectedClient(data);
            };
            fetchClient();
        }
    }, [searchParams, selectedClient]);

    // CSV Import Handler
    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const patients: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const patient: any = { cliente_id: tenantId, status: 'client' };

                headers.forEach((h, idx) => {
                    if (h.includes('nombre') || h === 'name') patient.name = values[idx];
                    if (h.includes('telefono') || h === 'phone' || h.includes('whatsapp')) patient.whatsapp_id = values[idx]?.replace(/\D/g, '');
                    if (h.includes('email')) patient.email = values[idx];
                });

                if (patient.name) patients.push(patient);
            }

            if (patients.length > 0) {
                const { error } = await supabase.from('clients').insert(patients);
                if (!error) {
                    alert(`✅ ${patients.length} pacientes importados correctamente`);
                    fetchClients();
                } else {
                    alert('Error al importar: ' + error.message);
                }
            }
        } catch (err) {
            alert('Error leyendo el archivo CSV');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Fetch Data when tenantId or filters change
    useEffect(() => {
        if (tenantId) {
            fetchClients();
            fetchAppointments();
        }
    }, [tenantId, filters]);

    const fetchClients = async () => {
        if (!tenantId) return;

        let query = supabase
            .from('clients')
            .select('*')
            .eq('cliente_id', tenantId) // Filter by tenant!
            .eq('status', 'client')
            .order('name');

        // Apply additional Filters
        if (filters.clinicId) query = query.eq('clinica_id', filters.clinicId);
        if (filters.doctorId) query = query.eq('doctor_id', filters.doctorId);
        if (filters.treatmentId) query = query.eq('treatment_id', filters.treatmentId);

        const { data } = await query;
        if (data) setClients(data);
    };

    const fetchAppointments = async () => {
        if (!tenantId) return;

        let query = supabase
            .from('appointments')
            .select('*, clients!inner(*)')
            .eq('cliente_id', tenantId) // Filter by tenant!
            .neq('status', 'cancelled')
            .order('start_time', { ascending: true });

        if (filters.clinicId) {
            query = query.eq('clinic_id', filters.clinicId);
        }

        const { data } = await query;
        if (data) setAppointments(data as ExtendedAppointment[]);
    };

    // --- FILTERS (Client Side Logic for Search/Tabs) ---
    const getFilteredContent = () => {
        const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const q = normalize(searchQuery);

        // Helper to search
        const matchesSearch = (c: Client | undefined) => {
            if (!c) return false;
            if (!q) return true;
            return normalize(c.name || '').includes(q) || normalize(c.whatsapp_id || '').includes(q);
        };

        if (activeTab === 'todos') {
            let list = clients.filter(c => matchesSearch(c));
            list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return list;
        }

        if (activeTab === 'hoy') {
            const today = new Date().toDateString();
            return appointments.filter(app => {
                if (!matchesSearch(app.clients)) return false;
                return new Date(app.start_time).toDateString() === today;
            });
        }

        if (activeTab === 'pendientes') {
            const now = new Date();
            return appointments.filter(app => {
                if (!matchesSearch(app.clients)) return false;
                return new Date(app.start_time) > now;
            });
        }

        if (activeTab === 'nuevos') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            return clients.filter(c => {
                return matchesSearch(c) && new Date(c.created_at) > cutoff;
            }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        return [];
    };

    const content = getFilteredContent();

    // --- HELPERS ---
    const getInitials = (name?: string) => name ? name.substring(0, 2).toUpperCase() : '??';
    const getRandomColor = (id: string) => {
        const colors = ['bg-pink-200 text-pink-700', 'bg-purple-200 text-purple-700', 'bg-blue-200 text-blue-700', 'bg-green-200 text-green-700', 'bg-yellow-100 text-yellow-700'];
        const idx = id.charCodeAt(0) % colors.length;
        return colors[idx];
    };
    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
        <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden text-[#1f2937] relative font-sans">

            {/* SIDEBAR FILTERS */}
            <div className="hidden md:block h-full shadow-sm z-10">
                <FilterSidebar onFilterChange={setFilters} />
            </div>

            <div className="flex-1 flex flex-col pt-6 px-4 pb-4 overflow-hidden w-full md:px-8">
                {/* HEADLINE */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Base de Pacientes</h1>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv"
                            onChange={handleImportCSV}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="px-4 py-2 bg-white border border-emerald-500 text-emerald-600 font-medium rounded-lg text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Upload size={16} />
                            {isImporting ? 'Importando...' : 'Cargar CSV'}
                        </button>
                        <button
                            onClick={() => setIsNewPatientOpen(true)}
                            className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} /> Nuevo paciente
                        </button>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="mb-6 relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, apellido, documento, email..."
                        className="w-full h-12 rounded-lg bg-white border border-gray-200 shadow-sm pl-12 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none placeholder-gray-400 transition-all"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                </div>

                {/* TABS */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2 border-b border-gray-200">
                    {['todos', 'hoy', 'pendientes', 'nuevos'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* LIST CONTENT */}
                <div className="flex-1 overflow-y-auto space-y-0 bg-white rounded-xl border border-gray-200 shadow-sm">
                    {/* TABLE HEADER */}
                    <div className="flex items-center p-4 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="w-12"></div> {/* Avatar spacer */}
                        <div className="flex-1 px-4">Nombre</div>
                        <div className="flex-1 px-4 hidden md:block">Email</div>
                        <div className="w-40 px-4 hidden md:block">Teléfono</div>
                    </div>

                    {content.length === 0 && (
                        <div className="text-center py-20 text-gray-400 text-sm">No se encontraron resultados.</div>
                    )}

                    {content.map((item: any) => {
                        const isAppointment = activeTab === 'hoy' || activeTab === 'pendientes';
                        const client = isAppointment ? item.clients : item;

                        if (!client) return null;

                        return (
                            <div
                                key={isAppointment ? item.id : client.id}
                                className="flex items-center p-4 border-b border-gray-50 hover:bg-purple-50/30 transition-colors cursor-pointer group"
                                onClick={() => setSelectedClient(client)}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold relative flex-shrink-0 ${getRandomColor(client.id)}`}>
                                    {getInitials(client.name)}
                                </div>

                                <div className="flex-1 px-4 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate">{client.name}</div>
                                </div>

                                <div className="flex-1 px-4 hidden md:block text-xs text-gray-500 truncate">
                                    {client.email || '-'}
                                </div>

                                <div className="w-40 px-4 hidden md:block text-xs text-gray-500">
                                    {client.whatsapp_id || '-'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Profile Overlay */}
            {selectedClient && (
                <div className="fixed inset-0 z-[200] bg-white lg:ml-20">
                    <ClientProfile
                        client={selectedClient}
                        onClose={() => setSelectedClient(null)}
                    />
                </div>
            )}

            {/* New Patient Modal */}
            <NewPatientModal
                isOpen={isNewPatientOpen}
                onClose={() => setIsNewPatientOpen(false)}
                onSuccess={fetchClients}
            />
        </div>
    );
}
