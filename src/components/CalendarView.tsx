"use client";

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCalendar, ExtendedAppointment } from '@/hooks/useCalendar';

// Components
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarSidebar } from './calendar/CalendarSidebar';
import { WeekView } from './calendar/WeekView';
import { MonthView } from './calendar/MonthView';
import { DayView } from './calendar/DayView';
import { YearView } from './calendar/YearView';
import { AppointmentForm } from './calendar/AppointmentForm';

export default function CalendarView() {
    const {
        currentDate, setCurrentDate,
        view, setView,
        searchQuery, setSearchQuery,
        appointments,
        clients,
        doctors,
        sidebarDoctors,
        doctorClinics,
        clinics,
        tenantId,
        selectedClinicId, setSelectedClinicId,
        selectedDoctors, toggleDoctorFilter, setSelectedDoctors,
        navigate,
        refreshAppointments
    } = useCalendar();

    // UI Local State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<ExtendedAppointment | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        clientId: '',
        clinicId: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date().toISOString().slice(0, 16),
        status: 'scheduled' as any
    });

    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Handle URL params
    useEffect(() => {
        const clientIdFromUrl = searchParams.get('client_id');
        if (clientIdFromUrl) {
            setFormData(prev => ({ ...prev, clientId: clientIdFromUrl }));
            setCreateModalOpen(true);
            const params = new URLSearchParams(searchParams.toString());
            params.delete('client_id');
            const newUrl = pathname + (params.toString() ? '?' + params.toString() : '');
            window.history.replaceState(null, '', newUrl);
        }
    }, [searchParams, pathname]);

    // Drag & Drop
    const handleDragStart = (e: React.DragEvent, appId: string) => {
        setDraggingId(appId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newDate: Date) => {
        e.preventDefault();
        if (!draggingId) return;

        const app = appointments.find(a => a.id === draggingId);
        if (!app) return;

        const oldStart = new Date(app.start_time);
        const oldEnd = new Date(app.end_time);
        const duration = oldEnd.getTime() - oldStart.getTime();

        const newStart = newDate;
        const newEnd = new Date(newStart.getTime() + duration);

        const { error } = await supabase
            .from('appointments')
            .update({
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString(),
                status: 'rescheduled'
            })
            .eq('id', draggingId);

        setDraggingId(null);
        if (!error) {
            refreshAppointments();
        } else {
            alert("Error al mover la cita");
        }
    };

    // Modal Helpers
    const toLocalISOString = (date: Date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const openCreateModal = (app?: ExtendedAppointment, defaultDate?: Date) => {
        if (app) {
            setEditingApp(app);
            setFormData({
                clientId: app.client_id,
                clinicId: app.clinic_id || '',
                start: toLocalISOString(new Date(app.start_time)),
                end: toLocalISOString(new Date(app.end_time || app.start_time)),
                status: app.status
            });
        } else {
            setEditingApp(null);
            const now = defaultDate ? new Date(defaultDate) : new Date();
            if (!defaultDate) {
                now.setMinutes(0, 0, 0);
                now.setHours(now.getHours() + 1);
            }
            setFormData({
                clientId: '',
                clinicId: selectedClinicId || '', // Default to current clinic filter
                start: toLocalISOString(now),
                end: toLocalISOString(new Date(now.getTime() + 60 * 60 * 1000)),
                status: 'scheduled'
            });
        }
        setCreateModalOpen(true);
    };

    const handleSave = async (data: any) => {
        const payload = {
            id: editingApp?.id,
            client_id: data.clientId,
            cliente_id: tenantId, // Pass the tenant ID
            clinic_id: data.clinicId || null,
            doctor_id: data.doctorId || null,
            start_time: new Date(data.start).toISOString(),
            end_time: new Date(data.end).toISOString(),
            status: data.status,
        };
        console.log('[CalendarView] Payload to save:', payload);

        const method = editingApp ? 'PUT' : 'POST';
        const response = await fetch('/api/appointments', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            alert('Error al guardar: ' + (err.error || 'Error desconocido'));
        } else {
            setCreateModalOpen(false);
            setEditingApp(null);
            refreshAppointments();
        }
    };

    const handleDelete = async () => {
        if (!editingApp || !confirm('¿Eliminar esta cita?')) return;

        try {
            const response = await fetch(`/api/appointments?id=${editingApp.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setCreateModalOpen(false);
                refreshAppointments();
            } else {
                const err = await response.json();
                alert('Error al eliminar: ' + (err.error || 'Error desconocido'));
            }
        } catch (err: any) {
            console.error('Delete Error:', err);
            alert('Error al conectar con el servidor');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white text-[#3c4043] font-sans text-sm selection:bg-[#c2e7ff] selection:text-[#1f1f1f]">
            <CalendarHeader
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                currentDate={currentDate}
                onNavigate={navigate}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                view={view}
                setView={setView}
                clinics={clinics}
                selectedClinicId={selectedClinicId}
                setSelectedClinicId={setSelectedClinicId}
            />

            <div className="flex-1 flex w-full overflow-hidden">
                {isSidebarOpen && (
                    <CalendarSidebar
                        onCreateClick={() => openCreateModal()}
                        currentDate={currentDate}
                        onSelectDate={(d, openModal) => {
                            setCurrentDate(d);
                            if (openModal) {
                                openCreateModal(undefined, d);
                            }
                        }}
                        doctors={sidebarDoctors}
                        selectedDoctors={selectedDoctors}
                        onToggleDoctor={toggleDoctorFilter}
                        onSelectAllDoctors={() => setSelectedDoctors(doctors.map(d => d.id))}
                    />
                )}

                <main className="flex-1 flex flex-col h-full bg-white border-l border-[#dadce0] overflow-hidden relative">
                    {view === 'week' && (
                        <WeekView
                            currentDate={currentDate}
                            appointments={appointments}
                            onDateClick={(d) => { setCurrentDate(d); setView('day'); }}
                            onEventClick={openCreateModal}
                            onSlotClick={(d) => openCreateModal(undefined, d)}
                            onEventDrop={handleDrop}
                            onDragStart={handleDragStart}
                            doctors={doctors}
                        />
                    )}
                    {view === 'day' && (
                        <DayView
                            currentDate={currentDate}
                            appointments={appointments}
                            onEventClick={openCreateModal}
                            onSlotClick={(d) => openCreateModal(undefined, d)}
                            onEventDrop={handleDrop}
                            onDragStart={handleDragStart}
                        />
                    )}
                    {view === 'month' && (
                        <MonthView
                            currentDate={currentDate}
                            appointments={appointments}
                            onEventClick={openCreateModal}
                            onSlotClick={(d) => openCreateModal(undefined, d)}
                        />
                    )}
                    {view === 'year' && (
                        <YearView
                            currentDate={currentDate}
                            appointments={appointments}
                            onDateClick={(d) => { setCurrentDate(d); setView('day'); }}
                        />
                    )}
                </main>
            </div>

            {/* Simple Modal Implementation */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <AppointmentForm
                        isEditing={!!editingApp}
                        initialData={{
                            clientId: formData.clientId,
                            clinicId: formData.clinicId,
                            doctorId: editingApp?.doctor_id || '',
                            start: formData.start,
                            end: formData.end,
                            status: formData.status as any,
                        }}
                        clients={clients}
                        clinics={clinics}
                        doctors={doctors}
                        doctorClinics={doctorClinics}
                        onClose={() => setCreateModalOpen(false)}
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                </div>
            )}
        </div>
    );
}
