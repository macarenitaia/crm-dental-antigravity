
import { supabaseAdmin } from "@/lib/supabase-admin";
import { model, embeddingModel } from "@/lib/gemini";

// --- Tool Implementations ---

// Helper to get Madrid Date with offset
function toMadridDate(dateStr: string) {
    // If dateStr comes as "2025-12-23T17:00:00", treat it as Madrid time
    const cleanDate = dateStr.replace('Z', '');

    // Determine if DST (rough: last Sunday March to last Sunday October)
    const d = new Date(cleanDate);
    const month = d.getMonth();
    const isDST = month >= 2 && month <= 9; // March (2) to October (9)

    const offset = isDST ? '+02:00' : '+01:00';
    return new Date(`${cleanDate}${offset}`);
}

// Simple Spanish name-based gender inference
function inferGender(name: string | undefined): 'Masculino' | 'Femenino' | null {
    if (!name) return null;
    const firstName = name.split(' ')[0]?.toLowerCase().trim();
    if (!firstName) return null;

    // Explicit common names (overrides ending rules)
    const femaleNames = ['carmen', 'macarena', 'maria', 'lucia', 'sofia', 'elena', 'ana', 'paula', 'laura', 'marta', 'pilar', 'ines', 'isabel', 'rosa', 'dolores', 'beatriz', 'raquel', 'silvia', 'cristina', 'teresa', 'sara', 'irene', 'nuria', 'alba'];
    const maleNames = ['luis', 'juan', 'carlos', 'jose', 'antonio', 'manuel', 'francisco', 'david', 'pedro', 'miguel', 'angel', 'pablo', 'sergio', 'jorge', 'alberto', 'rafael', 'javier', 'alejandro', 'fernando', 'adrian', 'marcos', 'lucas', 'diego', 'hugo'];

    if (femaleNames.includes(firstName)) return 'Femenino';
    if (maleNames.includes(firstName)) return 'Masculino';

    // Common Spanish name endings
    if (firstName.endsWith('a') && !firstName.endsWith('ia')) return 'Femenino';
    if (firstName.endsWith('o')) return 'Masculino';

    return null;
}

export async function checkCalendarAvailability(date: string, clinicId?: string, tenantId?: string) {
    console.log(`Checking availability for: ${date} (Clinic: ${clinicId || 'All'}, Tenant: ${tenantId || 'All'})`);
    const startHour = 9;
    const endHour = 18;

    // Build query - Filter by tenant if provided
    let query = supabaseAdmin
        .from('appointments')
        .select('start_time')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .neq('status', 'cancelled');

    // Filter by tenant if provided
    if (tenantId) {
        query = query.eq('cliente_id', tenantId);
    }

    // Filter by clinic if provided
    if (clinicId) {
        query = query.eq('clinic_id', clinicId);
    }

    const { data: appointments, error } = await query;

    if (error) {
        return { error: "Failed to fetch calendar data." };
    }

    const availableSlots = [];
    for (let h = startHour; h <= endHour; h++) {
        const hourStr = h.toString().padStart(2, '0');
        const slotLocal = `${date}T${hourStr}:00:00`;
        const slotDate = toMadridDate(slotLocal);

        const isBusy = appointments?.some(app => {
            const appStart = new Date(app.start_time);
            return Math.abs(appStart.getTime() - slotDate.getTime()) < 1000 * 60 * 30;
        });

        if (!isBusy) {
            availableSlots.push(`${hourStr}:00`);
        }
    }

    return {
        date,
        clinicId,
        available_slots: availableSlots.length > 0 ? availableSlots : "No slots available"
    };
}

export async function bookAppointment(clientId: string, startTime: string, reason: string, clinicId?: string, tenantId?: string, fullName?: string, email?: string, phone?: string) {
    const start = toMadridDate(startTime);
    const end = new Date(start.getTime() + 30 * 60000); // +30 mins

    console.log(`Booking: Input=${startTime} -> Clinic=${clinicId || 'None'} -> Tenant=${tenantId || 'None'} -> UTC=${start.toISOString()}`);

    // Auto-assign doctor if only one exists for this clinic
    let doctorId: string | null = null;
    if (clinicId && tenantId) {
        const { data: doctorClinics } = await supabaseAdmin
            .from('doctor_clinics')
            .select('doctor_id')
            .eq('clinic_id', clinicId)
            .eq('cliente_id', tenantId);

        if (doctorClinics && doctorClinics.length === 1) {
            doctorId = doctorClinics[0].doctor_id;
            console.log(`Auto-assigned doctor: ${doctorId}`);
        } else if (doctorClinics && doctorClinics.length > 1) {
            // If multiple doctors, pick the first one as default
            doctorId = doctorClinics[0].doctor_id;
            console.log(`Multiple doctors found, defaulting to first: ${doctorId}`);
        }
    }

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert({
            client_id: clientId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status: 'scheduled',
            clinic_id: clinicId || null,
            doctor_id: doctorId,
            reason: reason || null, // ✅ Save visit reason!
            cliente_id: tenantId || null
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            console.warn("Race condition detected! Booking blocked.");
            return { error: "Lo siento, alguien ha reservado ese hueco hace menos de un segundo. ¡Qué rapidez! prueba con otro." };
        }
        return { error: `Booking failed: ${error.message}` };
    }

    // Update Client Profile and promote to Client status
    const updateData: any = { status: 'client' };
    if (fullName) updateData.name = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Infer gender from name
    const inferredGender = inferGender(fullName);
    if (inferredGender) updateData.gender = inferredGender;

    await supabaseAdmin
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

    return { success: true, appointment: data };
}

export async function searchKnowledgeBase(query: string, tenantId?: string) {
    try {
        console.log(`RAG Search: "${query.slice(0, 50)}..." for tenant ${tenantId || 'All'}`);

        // Generate embedding for query
        const embeddingResult = await embeddingModel.embedContent(query);
        const vector = embeddingResult.embedding.values;

        // If we have a tenantId, filter by it
        if (tenantId) {
            // Direct query with tenant filter
            const { data, error } = await supabaseAdmin
                .from('knowledge_base')
                .select('content, metadata')
                .eq('cliente_id', tenantId)
                .limit(5);

            if (error) {
                console.error("RAG Error:", error);
                return { error: "Failed to search knowledge base." };
            }

            if (!data || data.length === 0) {
                return { info: "No specific information found in knowledge base for this clinic." };
            }

            // Simple text search (embedding search would be better but this works)
            const context = data.map((item: any) => item.content).join("\n---\n");
            return {
                info: context,
                source: "Internal Knowledge Base"
            };
        }

        // Fallback to RPC for all tenants (legacy)
        const { data, error } = await supabaseAdmin.rpc('match_knowledge', {
            query_embedding: vector,
            match_threshold: 0.5,
            match_count: 3
        });

        if (error) {
            console.error("RAG Error:", error);
            return { error: "Failed to search knowledge base." };
        }

        if (!data || data.length === 0) {
            return { info: "No specific information found in knowledge base." };
        }

        const context = data.map((item: any) => item.content).join("\n---\n");
        return {
            info: context,
            source: "Internal Knowledge Base"
        };
    } catch (e) {
        console.error("Embedding Error:", e);
        return { error: "Failed to generate embedding." };
    }
}

export async function cancel_appointment(clientId: string, date: string) {
    console.log(`Cancelling appointment for client ${clientId} on ${date}`);

    // Find appointments for this client on that day
    const { data: appts } = await supabaseAdmin.from('appointments')
        .select('*')
        .eq('client_id', clientId)
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`)
        .neq('status', 'cancelled');

    if (!appts || appts.length === 0) {
        return { error: "No appointment found to cancel on that date." };
    }

    // Cancel all found (safe assumption for this persona who likely has 1 appt/day max)
    const { error } = await supabaseAdmin.from('appointments')
        .update({ status: 'cancelled' })
        .in('id', appts.map(a => a.id));

    if (error) return { error: "Failed to cancel." };

    return { success: true, message: `Cancelled ${appts.length} appointment(s).` };
}

export async function reschedule_appointment(clientId: string, originalDate: string, newStartTime: string, clinicId?: string, tenantId?: string) {
    console.log(`Rescheduling appointment for client ${clientId} from ${originalDate} to ${newStartTime}`);

    // Find the existing appointment on the original date
    const { data: appts } = await supabaseAdmin.from('appointments')
        .select('*')
        .eq('client_id', clientId)
        .gte('start_time', `${originalDate}T00:00:00`)
        .lte('start_time', `${originalDate}T23:59:59`)
        .neq('status', 'cancelled');

    if (!appts || appts.length === 0) {
        return { error: "No appointment found to reschedule on that date." };
    }

    // Take the first appointment
    const originalAppointment = appts[0];
    const finalClinicId = clinicId || originalAppointment.clinic_id;

    // 1. CANCEL the original appointment
    const { error: cancelError } = await supabaseAdmin.from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', originalAppointment.id);

    if (cancelError) {
        return { error: `Failed to cancel original appointment: ${cancelError.message}` };
    }

    // 2. Calculate new times
    const newStart = toMadridDate(newStartTime);
    const newEnd = new Date(newStart.getTime() + 30 * 60000); // +30 mins

    // 3. Auto-assign doctor for the clinic
    let doctorId: string | null = originalAppointment.doctor_id || null;
    if (finalClinicId && tenantId && !doctorId) {
        const { data: doctorClinics } = await supabaseAdmin
            .from('doctor_clinics')
            .select('doctor_id')
            .eq('clinic_id', finalClinicId)
            .eq('cliente_id', tenantId);

        if (doctorClinics && doctorClinics.length >= 1) {
            doctorId = doctorClinics[0].doctor_id;
        }
    }

    // 4. CREATE new appointment with status 'rescheduled'
    const { data, error } = await supabaseAdmin.from('appointments')
        .insert({
            client_id: clientId,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            status: 'rescheduled', // Orange color
            clinic_id: finalClinicId,
            doctor_id: doctorId,
            cliente_id: tenantId || originalAppointment.cliente_id
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return { error: "Lo siento, ese horario ya está ocupado. Por favor, elige otro." };
        }
        return { error: `Rescheduling failed: ${error.message}` };
    }

    return {
        success: true,
        message: `Cita reprogramada correctamente. La cita anterior ha sido cancelada.`,
        appointment: data
    };
}
