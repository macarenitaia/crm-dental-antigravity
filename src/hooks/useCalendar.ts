import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Appointment, Client } from '@/types';
import { useTenant } from '@/contexts/TenantContext';

export type ExtendedAppointment = Appointment & {
    clients: Client;
    clinic_id?: string;
    doctor_id?: string;
};

export type CalendarViewType = 'day' | 'week' | 'month' | 'year';

export const useCalendar = () => {
    const { tenantId } = useTenant();

    // --- STATE ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [searchQuery, setSearchQuery] = useState('');
    const [appointments, setAppointments] = useState<ExtendedAppointment[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [clinics, setClinics] = useState<{ id: string, name: string }[]>([]);
    const [doctors, setDoctors] = useState<{ id: string, name: string, specialty: string | null, color: string }[]>([]);
    const [doctorClinics, setDoctorClinics] = useState<{ doctor_id: string, clinic_id: string }[]>([]);

    // Filters
    const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
    const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);

    // Loading State
    const [loading, setLoading] = useState(true);

    // --- FETCH DATA ---
    const fetchClinics = useCallback(async () => {
        if (!tenantId) return;
        const { data, error } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('cliente_id', tenantId);

        if (error) console.error('[useCalendar] fetchClinics Error:', error);
        if (data) setClinics(data);
    }, [tenantId]);

    const fetchAppointments = useCallback(async () => {
        if (!tenantId) return;
        const { data, error } = await supabase
            .from('appointments')
            .select('*, clients(*)')
            .eq('cliente_id', tenantId) // Filter by tenant
            .order('start_time');

        if (error) console.error('[useCalendar] fetchAppointments Error:', error);
        if (data) {
            setAppointments(data as ExtendedAppointment[]);
        }
    }, [tenantId]);

    const fetchMetadata = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const [clientsRes, clinicsRes, doctorsRes, doctorClinicsRes] = await Promise.all([
            supabase.from('clients').select('*').eq('cliente_id', tenantId),
            supabase.from('clinics').select('id, name').eq('cliente_id', tenantId),
            supabase.from('doctors').select('id, name, specialty, color').eq('cliente_id', tenantId).eq('is_active', true),
            supabase.from('doctor_clinics').select('doctor_id, clinic_id').eq('cliente_id', tenantId)
        ]);

        if (clientsRes.data) setClients(clientsRes.data);

        if (clinicsRes.data) {
            setClinics(clinicsRes.data);
            if (!selectedClinicId && clinicsRes.data.length > 0) {
                setSelectedClinicId(clinicsRes.data[0].id);
            }
        }

        if (doctorsRes.data) {
            setDoctors(doctorsRes.data);
            setSelectedDoctors(prev => prev.length === 0 ? doctorsRes.data.map(d => d.id) : prev);
        }

        if (doctorClinicsRes.data) {
            setDoctorClinics(doctorClinicsRes.data);
        }

        setLoading(false);
    }, [tenantId, selectedClinicId]);

    // Initial Load & Subscription
    useEffect(() => {
        if (!tenantId) return;

        fetchMetadata();
        fetchAppointments();

        const channel = supabase.channel('calendar_main')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [tenantId, fetchMetadata, fetchAppointments]);


    // --- FILTERING ---
    const filteredAppointments = useMemo(() => {
        return appointments.filter(app => {
            // 1. Status Filter
            if (app.status === 'cancelled') return false;

            // 2. Clinic Filter
            if (selectedClinicId && app.clinic_id !== selectedClinicId) return false;

            // 3. Doctor Filter
            if (app.doctor_id && selectedDoctors.length > 0 && !selectedDoctors.includes(app.doctor_id)) return false;

            // 4. Search Filter
            if (!searchQuery) return true;

            const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const q = normalize(searchQuery);
            const clientData = Array.isArray(app.clients) ? app.clients[0] : app.clients;
            const name = normalize(clientData?.name || '');
            const terms = q.split(' ').filter(t => t);

            return terms.every(t => name.includes(t));
        }).map(app => {
            // Logic to auto-confirm past appointments
            const now = new Date();
            const appEnd = new Date(app.end_time || app.start_time);

            if (appEnd < now && app.status === 'scheduled') {
                return { ...app, status: 'confirmed' as const };
            }
            return app;
        });
    }, [appointments, selectedClinicId, selectedDoctors, searchQuery]);

    const sidebarDoctors = useMemo(() => {
        if (!selectedClinicId) return doctors;
        const clinicDoctorIds = doctorClinics
            .filter(dc => dc.clinic_id === selectedClinicId)
            .map(dc => dc.doctor_id);
        return doctors.filter(d => clinicDoctorIds.includes(d.id));
    }, [doctors, doctorClinics, selectedClinicId]);

    // --- NAVIGATION ---
    const navigate = (direction: 'prev' | 'next' | 'today') => {
        const newDate = new Date(currentDate);
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const diff = direction === 'next' ? 1 : -1;
        if (view === 'day') newDate.setDate(newDate.getDate() + diff);
        if (view === 'week') newDate.setDate(newDate.getDate() + (diff * 7));
        if (view === 'month') newDate.setMonth(newDate.getMonth() + diff);
        if (view === 'year') newDate.setFullYear(newDate.getFullYear() + diff);

        setCurrentDate(newDate);
    };

    // --- ACTIONS ---
    const toggleDoctorFilter = (id: string) => {
        setSelectedDoctors(prev =>
            prev.includes(id)
                ? prev.filter(d => d !== id)
                : [...prev, id]
        );
    };

    return {
        // State
        currentDate, setCurrentDate,
        view, setView,
        searchQuery, setSearchQuery,
        loading,

        // Data
        appointments: filteredAppointments,
        allAppointments: appointments, // raw data if needed
        clients,
        clinics,
        doctors,
        sidebarDoctors,
        doctorClinics,

        // Selections
        tenantId,
        selectedClinicId, setSelectedClinicId,
        selectedDoctors, setSelectedDoctors,
        toggleDoctorFilter,

        // Actions
        navigate,
        refreshAppointments: fetchAppointments
    };
};
