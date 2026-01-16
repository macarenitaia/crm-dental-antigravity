
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
function inferGender(name: string | undefined): 'male' | 'female' | null {
    if (!name) return null;
    const firstName = name.split(' ')[0]?.toLowerCase().trim();
    if (!firstName) return null;

    // Explicit common names (overrides ending rules)
    const femaleNames = ['carmen', 'macarena', 'maria', 'lucia', 'sofia', 'elena', 'ana', 'paula', 'laura', 'marta', 'pilar', 'ines', 'isabel', 'rosa', 'dolores', 'beatriz', 'raquel', 'silvia', 'cristina', 'teresa', 'sara', 'irene', 'nuria', 'alba'];
    const maleNames = ['luis', 'juan', 'carlos', 'jose', 'antonio', 'manuel', 'francisco', 'david', 'pedro', 'miguel', 'angel', 'pablo', 'sergio', 'jorge', 'alberto', 'rafael', 'javier', 'alejandro', 'fernando', 'adrian', 'marcos', 'lucas', 'diego', 'hugo'];

    if (femaleNames.includes(firstName)) return 'female';
    if (maleNames.includes(firstName)) return 'male';

    // Common Spanish name endings
    if (firstName.endsWith('a') && !firstName.endsWith('ia')) return 'female';
    if (firstName.endsWith('o')) return 'male';

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

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert({
            client_id: clientId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status: 'scheduled',
            clinic_id: clinicId || null,
            cliente_id: tenantId || null // ✅ Include tenant!
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
