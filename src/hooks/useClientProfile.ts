import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext'; // Assuming this exists as used in CalendarView
import { Client, Appointment } from '@/types'; // Assuming types exist

// Define missing types based on usage
export interface ClinicalHistory {
    id: string;
    date: string;
    doctor_id: string;
    diagnosis: string;
    treatment: string;
    observations: string;
    doctors?: { name: string };
}

export interface Treatment {
    id: string;
    description: string;
    cost: number;
    status: 'pending' | 'in_progress' | 'completed';
    // Add other fields as necessary
}

export const useClientProfile = (client: Client | null) => {
    const { tenantId } = useTenant();
    const [activeTab, setActiveTab] = useState('resumen');

    // Data State
    const [history, setHistory] = useState<ClinicalHistory[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]); // Adjust type if needed
    const [doctors, setDoctors] = useState<{ id: string, name: string, color: string }[]>([]);

    // Loading State
    const [loading, setLoading] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!client || !tenantId) return;
        const { data, error } = await supabase
            .from('clinical_history')
            .select('*, doctors(name)')
            .eq('client_id', client.id)
            .eq('cliente_id', tenantId) // Tenant filter
            .order('date', { ascending: false });

        if (data) setHistory(data);
    }, [client, tenantId]);

    const fetchAppointments = useCallback(async () => {
        if (!client || !tenantId) return;
        const { data } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', client.id)
            .eq('cliente_id', tenantId)
            .order('start_time', { ascending: false });


        if (data) {
            const now = new Date();
            const virtualized = data.map((app: any) => {
                const appEnd = new Date(app.end_time || app.start_time);
                if (appEnd < now && app.status === 'scheduled') {
                    return { ...app, status: 'confirmed' };
                }
                return app;
            });
            setAppointments(virtualized);
        }
    }, [client, tenantId]);

    const fetchTreatments = useCallback(async () => {
        if (!client || !tenantId) return;
        const { data, error } = await supabase
            .from('patient_treatments')
            .select('*')
            .eq('client_id', client.id)
            .eq('cliente_id', tenantId);

        if (error) {
            console.error('Error fetching treatments:', error);
            return;
        }

        // Map database fields to UI Treatment type
        const mappedTreatments: Treatment[] = (data || []).map(t => ({
            id: t.id,
            description: t.name || 'Sin descripción',
            cost: t.budget_amount || 0,
            status: t.status || 'pending'
        }));

        setTreatments(mappedTreatments);
    }, [client, tenantId]);

    const fetchDoctors = useCallback(async () => {
        if (!tenantId) return;
        const { data } = await supabase
            .from('doctors')
            .select('id, name, color')
            .eq('cliente_id', tenantId)
            .eq('is_active', true);
        if (data) setDoctors(data.map(d => ({ ...d, color: d.color || '#10b981' })));
    }, [tenantId]);

    const [relationships, setRelationships] = useState<any[]>([]);
    const [allPotentialRelatives, setAllPotentialRelatives] = useState<Client[]>([]);

    const fetchRelationships = useCallback(async () => {
        if (!client || !tenantId) return;
        const { data } = await supabase
            .from('client_relationships')
            .select('*, related_client:related_client_id(*)')
            .eq('client_id', client.id)
            .eq('cliente_id', tenantId);

        if (data) setRelationships(data);
    }, [client, tenantId]);

    const fetchAllPotentialRelatives = useCallback(async () => {
        if (!tenantId) return;
        const { data } = await supabase
            .from('clients')
            .select('*')
            .eq('cliente_id', tenantId)
            .neq('id', client?.id)
            .limit(100);
        if (data) setAllPotentialRelatives(data);
    }, [tenantId, client?.id]);

    const [clinics, setClinics] = useState<{ id: string, name: string }[]>([]);
    const [doctorClinics, setDoctorClinics] = useState<{ doctor_id: string, clinic_id: string }[]>([]);

    const fetchClinics = useCallback(async () => {
        if (!tenantId) return;
        const { data } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('tenant_id', tenantId);
        if (data) setClinics(data);
    }, [tenantId]);

    const fetchDoctorClinics = useCallback(async () => {
        if (!tenantId) return;
        const { data } = await supabase
            .from('doctor_clinics')
            .select('doctor_id, clinic_id')
            .eq('cliente_id', tenantId);
        if (data) setDoctorClinics(data);
    }, [tenantId]);

    useEffect(() => {
        if (client && tenantId) {
            setLoading(true);
            Promise.all([
                fetchHistory(),
                fetchAppointments(),
                fetchTreatments(),
                fetchDoctors(),
                fetchRelationships(),
                fetchAllPotentialRelatives(),
                fetchClinics(),
                fetchDoctorClinics()
            ]).finally(() => setLoading(false));
        }
    }, [client, tenantId, fetchHistory, fetchAppointments, fetchTreatments, fetchDoctors, fetchRelationships, fetchAllPotentialRelatives, fetchClinics, fetchDoctorClinics]);

    return {
        activeTab, setActiveTab,
        history, setHistory,
        appointments, setAppointments,
        treatments, setTreatments,
        doctors,
        clinics,
        doctorClinics,
        relationships,
        allPotentialRelatives,
        loading,
        refreshHistory: fetchHistory,
        refreshAppointments: fetchAppointments,
        refreshTreatments: fetchTreatments,
        refreshRelationships: fetchRelationships,
        refreshAllData: () => {
            fetchHistory();
            fetchAppointments();
            fetchTreatments();
            fetchRelationships();
            fetchClinics();
            fetchDoctorClinics();
        }
    };
};
