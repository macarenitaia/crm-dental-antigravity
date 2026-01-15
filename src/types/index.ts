export interface Client {
    id: string;
    whatsapp_id: string;
    cliente_id?: string;
    clinica_id?: string;
    name: string;
    email?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    dni?: string;
    address?: string;
    notes?: string;
    profile_picture?: string;
    image_url?: string;
    psychological_profile?: string;
    created_at: string;
}

export interface ClientRelationship {
    id: string;
    cliente_id: string;
    client_id: string;
    related_client_id: string;
    relationship_type: string;
    notes?: string;
    related_client?: Client;
}
export interface Message {
    id: string;
    client_id: string;
    cliente_id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface Clinic {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    tenant_id: string;
    created_at: string;
}

export interface Tenant {
    id: string;
    name: string;
    ai_config?: {
        user_prompt?: string;
        whatsapp_keys?: {
            phone_id: string;
            api_key: string;
        };
        whatsapp_templates?: {
            confirmation: string;
            mapping?: {
                header?: string[];
                body?: string[];
                buttons?: string[];
            }
        }
    };
    created_at: string;
}

export interface AIChatQueueEntry {
    id: string;
    client_id: string;
    cliente_id: string;
    appointment_id?: string;
    context: any; // Context can be complex, but let's try to refine if possible later
    status: 'pending' | 'negotiating' | 'completed' | 'failed';
    created_at: string;
    // Joined data
    appointments?: { clinic_id: string };
    tenants?: { ai_config: any };
}

export interface Appointment {
    id: string;
    client_id: string;
    cliente_id?: string;
    clinic_id?: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'cancelled' | 'completed' | 'confirmed' | 'rescheduled';
    created_at: string;
    doctor_id?: string;
}

export interface Knowledge {
    id: string;
    content: string;
    embedding?: number[];
    created_at: string;
}

// =====================================================
// TREATMENT-BILLING INTEGRATION TYPES
// =====================================================

export interface PatientTreatment {
    id: string;
    cliente_id: string;
    client_id: string;
    treatment_type_id?: string;
    doctor_id?: string;
    clinic_id?: string;
    name: string;
    tooth_numbers?: string;
    notes?: string;
    status: 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    budget_amount: number;
    budget_accepted_at?: string;
    invoiced_amount: number;
    paid_amount: number;
    start_date?: string;
    estimated_end_date?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    // Joined data
    doctor?: { id: string; name: string; specialty?: string };
    clinic?: { id: string; name: string };
}

export interface TreatmentPhase {
    id: string;
    treatment_id: string;
    cliente_id: string;
    name: string;
    description?: string;
    phase_order: number;
    amount: number;
    status: 'pending' | 'in_progress' | 'completed' | 'invoiced';
    invoice_id?: string;
    completed_at?: string;
    created_at: string;
}

export interface AccountBalance {
    id: string;
    cliente_id: string;
    client_id: string;
    type: 'deposit' | 'usage' | 'refund';
    amount: number;
    description?: string;
    invoice_id?: string;
    payment_id?: string;
    balance_after: number;
    created_at: string;
}

export interface Invoice {
    id: string;
    invoice_number: string;
    cliente_id: string;
    client_id: string;
    treatment_id?: string;
    phase_id?: string;
    clinic_id?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
    issue_date: string;
    due_date: string;
    paid_amount: number;
    is_rectification: boolean;
    rectified_invoice_id?: string;
    created_at: string;
    // Joined data
    client?: Client;
    treatment?: PatientTreatment;
}

// Legacy type for compatibility
export interface Treatment {
    id: string;
    client_id: string;
    name: string;
    tooth_numbers?: string;
    status: 'planned' | 'in_progress' | 'completed';
    budget?: number;
    doctor?: string;
    progress?: number;
    start_date: string;
    created_at: string;
}

