import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import { X, CheckCircle } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useClientProfile } from '@/hooks/useClientProfile';

// Sub Components
import { ClientSummary } from './client/ClientSummary';
import { ClientDataTab } from './client/ClientDataTab';
import { ClientHistoryTab } from './client/ClientHistoryTab';
import { ClientTreatmentsTab } from './client/ClientTreatmentsTab';
import { ClientAppointmentsTab } from './client/ClientAppointmentsTab';

// Modals
import TreatmentModal from './TreatmentModal';
import NewHistoryModal from './NewHistoryModal';
import NewInvoiceModal from './NewInvoiceModal';
import { AppointmentForm } from './calendar/AppointmentForm';

interface ClientProfileProps {
    client: Client | null;
    onClose?: () => void;
}

const ClientProfile = ({ client: initialClient, onClose }: ClientProfileProps) => {
    const { tenantId } = useTenant();

    // We maintain local client state for edits
    const [client, setClient] = useState<Client | null>(initialClient);

    // Hook for data fetching
    const {
        activeTab, setActiveTab,
        history, appointments, treatments, doctors,
        relationships, allPotentialRelatives,
        clinics, doctorClinics,
        refreshHistory, refreshTreatments, refreshAppointments, refreshRelationships
    } = useClientProfile(client);

    const [showTreatmentModal, setShowTreatmentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [invoiceTreatmentId, setInvoiceTreatmentId] = useState<string | null>(null);

    const handleSaveAppointment = async (data: any) => {
        const payload = {
            client_id: data.clientId,
            cliente_id: tenantId,
            clinic_id: data.clinicId || null,
            doctor_id: data.doctorId || null,
            start_time: new Date(data.start).toISOString(),
            end_time: new Date(data.end).toISOString(),
            status: data.status,
        };

        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            alert('Error al guardar: ' + (err.error || 'Error desconocido'));
        } else {
            setShowAppointmentModal(false);
            refreshAppointments();
        }
    };

    // Effect to sync prop client
    useEffect(() => {
        setClient(initialClient);
    }, [initialClient]);

    if (!client) return null;

    // Handlers
    const handleClientChange = (field: keyof Client, value: any) => {
        setClient(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const saveClientData = async () => {
        if (!client || !tenantId) return;
        const { error } = await supabase
            .from('clients')
            .update({
                name: client.name,
                email: client.email,
                phone: client.phone,
                gender: client.gender,
                date_of_birth: client.date_of_birth,
                dni: client.dni,
                address: client.address,
                notes: client.notes
            })
            .eq('id', client.id);

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            alert('Datos actualizados correctamente');
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header / Nav */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-lg z-40 border-b border-gray-100 flex items-center justify-between px-8 py-4 shadow-sm">
                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                    {['resumen', 'datos', 'historial', 'tratamientos', 'citas'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all whitespace-nowrap ${activeTab === tab
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Sidebar (Summary) - Moved to left and made stickier */}
                        <div className="w-full lg:w-[350px] shrink-0 sticky top-0">
                            <ClientSummary
                                client={client}
                                lastAppointment={appointments[0] ? new Date(appointments[0].start_time) : null}
                                nextAppointment={null}
                                totalTreatments={treatments.length}
                            />
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0 w-full">
                            <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-xl shadow-gray-200/50 border border-white/60 min-h-[600px] transition-all">
                                {activeTab === 'resumen' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-900 mb-2">Resumen General</h3>
                                                <p className="text-gray-500 font-medium">Vista rápida de la actividad del paciente</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 group hover:bg-emerald-50 transition-colors">
                                                <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-4">Próxima Visita</h4>
                                                {(() => {
                                                    const now = new Date();
                                                    const upcoming = appointments
                                                        .filter(a => new Date(a.start_time) > now && a.status !== 'cancelled')
                                                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
                                                    if (upcoming) {
                                                        const date = new Date(upcoming.start_time);
                                                        return (
                                                            <div>
                                                                <p className="text-gray-900 font-bold text-lg">
                                                                    {date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                                </p>
                                                                <p className="text-emerald-600 font-medium">
                                                                    {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                                {(upcoming as any).reason && (
                                                                    <p className="text-gray-500 text-sm mt-1">Motivo: {(upcoming as any).reason}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return <p className="text-gray-500 text-sm">No hay citas programadas próximamente.</p>;
                                                })()}
                                            </div>
                                            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 group hover:bg-blue-50 transition-colors">
                                                <h4 className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-4">Tratamiento Activo</h4>
                                                <p className="text-gray-500 text-sm">{treatments.find(t => t.status === 'in_progress')?.description || 'Ninguno en curso'}</p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Actividad Reciente</h4>
                                            <div className="space-y-4">
                                                {history.slice(0, 3).map(h => (
                                                    <div key={h.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                                                            <CheckCircle size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900 truncate">{h.treatment}</p>
                                                            <p className="text-xs text-gray-400">{new Date(h.date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {history.length === 0 && <p className="text-sm text-gray-400 italic">No hay actividad reciente.</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'datos' && (
                                    <ClientDataTab
                                        client={client}
                                        lastAppointment={null}
                                        onChange={handleClientChange}
                                        onSave={saveClientData}
                                        relationships={relationships}
                                        potentialRelatives={allPotentialRelatives}
                                        onRefreshRelationships={refreshRelationships}
                                    />
                                )}

                                {activeTab === 'historial' && (
                                    <ClientHistoryTab
                                        history={history}
                                        onAddEntry={() => setShowHistoryModal(true)}
                                    />
                                )}

                                {activeTab === 'tratamientos' && (
                                    <ClientTreatmentsTab
                                        treatments={treatments}
                                        onNewQuote={() => setShowTreatmentModal(true)}
                                        onInvoice={(tId) => {
                                            setInvoiceTreatmentId(tId);
                                            setShowInvoiceModal(true);
                                        }}
                                    />
                                )}

                                {activeTab === 'citas' && (
                                    <ClientAppointmentsTab
                                        appointments={appointments}
                                        onNewAppointment={() => setShowAppointmentModal(true)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {client && tenantId && (
                <>
                    <TreatmentModal
                        isOpen={showTreatmentModal}
                        onClose={() => setShowTreatmentModal(false)}
                        clientId={client.id}
                        tenantId={tenantId}
                        mode={'create'}
                        onSuccess={refreshTreatments}
                    />
                    <NewHistoryModal
                        isOpen={showHistoryModal}
                        onClose={() => setShowHistoryModal(false)}
                        clientId={client.id}
                        tenantId={tenantId}
                        doctors={doctors}
                        onSuccess={refreshHistory}
                    />
                    <NewInvoiceModal
                        isOpen={showInvoiceModal}
                        onClose={() => {
                            setShowInvoiceModal(false);
                            setInvoiceTreatmentId(null);
                        }}
                        tenantId={tenantId}
                        initialTreatmentId={invoiceTreatmentId}
                        onSuccess={() => {
                            alert('Factura creada correctamente');
                            setShowInvoiceModal(false);
                            setInvoiceTreatmentId(null);
                        }}
                    />
                    {showAppointmentModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                            <AppointmentForm
                                initialData={{
                                    clientId: client.id,
                                    clinicId: clinics[0]?.id || '',
                                    start: (() => {
                                        const d = new Date();
                                        d.setMinutes(0, 0, 0);
                                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    })(),
                                    end: (() => {
                                        const d = new Date(Date.now() + 3600000);
                                        d.setMinutes(0, 0, 0);
                                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                    })(),
                                    status: 'scheduled'
                                }}
                                clients={[{ id: client.id, name: client.name }]}
                                clinics={clinics}
                                doctors={doctors as any}
                                doctorClinics={doctorClinics}
                                onClose={() => setShowAppointmentModal(false)}
                                onSave={handleSaveAppointment}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ClientProfile;
