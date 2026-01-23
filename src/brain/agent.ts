
import { openai } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { crmTools } from './tools';
import { checkCalendarAvailability, bookAppointment, searchKnowledgeBase, cancel_appointment, reschedule_appointment } from './functions';
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

// Get current date in Madrid timezone
function getMadridDate() {
    return new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Europe/Madrid'
    });
}

const SYSTEM_INSTRUCTION = `
HOY ES: ${getMadridDate()}.

ROL: Eres Sofía, la secretaria de una clínica dental. Tu trabajo es CERRAR CITAS de forma eficiente.

⚠️ REGLAS CRÍTICAS (ANTI-BUCLE):

1. **FECHAS**: HOY es ${getMadridDate()}. "Mañana" = día siguiente. NO inventes fechas pasadas. Si el usuario dice "mañana a las 12", calcula la fecha real.

2. **SI EL USUARIO DA UNA HORA CONCRETA** (ej: "a las 12", "a las 10:00"):
   - SI EL USUARIO DA UNA HORA CONCRETA: VERIFICA ESA HORA. Si está libre, di "Perfecto, te agendo para mañana a las XX:XX" y EJECUTA book_appointment de inmediato. 
   - **PROHIBIDO** preguntar "¿te viene bien?" si el usuario ya te dijo esa hora. ACÉPTALO y agenda.
   - **MÁXIMO 2 OPCIONES**: Si te pide disponibilidad, ofrece solo 2 huecos (ej: "Mañana a las 10:00 o a las 16:00, ¿te va bien alguno?"). NUNCA listes más de dos.

3. **FLUJO DE CIERRE**:
   - Día + Hora + Motivo → AGENDA YA. No añadas pasos extra.
   - Si el usuario dice "A las 12", "Si", o "Perfecto", CIERRA la cita usando book_appointment.

4. **FECHAS (ZONA MADRID)**:
   - HOY ES: ${getMadridDate()}.
   - Mañana es: ${new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })}.
   - Si el usuario te corrige la fecha, confía en él, pero no propongas días pasados.

5. **ANTI-BUCLE**:
   - Si detectas que el usuario repite la hora, es que el sistema NO la ha guardado o estás preguntando de más. USA LA HERRAMIENTA DE AGENDAR.

ESTILO:
- Tuteo cercano, profesional
- Emojis con clase: 🦷 ✨ 📅
- Respuestas CORTAS y directas
- Si todo está listo para agendar, HAZLO
`;


// Default tenant ID for fallback (when no tenant matched by phone_id)
const DEFAULT_TENANT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; // HQ Macarenita IA

export async function processUserMessage(userId: string, message: string, profileName?: string, tenantId?: string | null) {
    console.log(`[AGENT_STEP] START: from=${userId}, profileName=${profileName || 'None'}, tenantId=${tenantId || 'default'}`);

    // Use provided tenantId or fallback to default
    const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

    // Helper for easier logging
    const logStep = async (step: string, data?: any) => {
        try {
            await supabaseAdmin.from('webhook_logs').insert({
                method: 'AGENT_STEP',
                url: step,
                body: data,
                query_params: { userId, effectiveTenantId }
            });
        } catch (e) {
            console.error('Log Step failed:', e);
        }
    };

    await logStep('START', { message });

    try {
        // 1. Get/Create Client - ALWAYS assign to a tenant
        await logStep('FETCHING_CLIENT');
        let { data: client, error: fetchError } = await supabaseAdmin
            .from('clients')
            .select('id, name, email, preferred_clinic_id, cliente_id, phone')
            .eq('whatsapp_id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching client:", fetchError);
            return;
        }

        if (!client) {
            console.log(`New client detected: ${userId}. Creating profile with tenant ${effectiveTenantId}...`);
            const { data: newClient, error: createError } = await supabaseAdmin
                .from('clients')
                .insert({
                    whatsapp_id: userId,
                    name: `Paciente ${userId.slice(-4)}`, // Use a generic but professional placeholder
                    phone: userId, // ✅ Save phone immediately!
                    status: 'lead',
                    cliente_id: effectiveTenantId // ✅ Assign to tenant!
                })
                .select()
                .single();

            if (createError || !newClient) {
                console.error("Error creating client:", createError);
                return;
            }
            client = newClient;
        }

        // Ensure existing clients also have the phone number set
        if (client && !(client as any).phone) {
            console.log(`Adding missing phone for client ${client.id}...`);
            await supabaseAdmin.from('clients').update({ phone: userId }).eq('id', client.id);
            (client as any).phone = userId;
        }

        if (!client) {
            console.error("Critical: Client could not be created or found.");
            return;
        }

        // Get tenant ID from client (for existing clients that have one)
        const clientTenantId = (client as any).cliente_id || effectiveTenantId;

        // 2. Parallelized Fetching for Optimization (Latency reduction)
        await logStep('PARALLEL_FETCH_START');
        const [clinicsRes, tenantConfigRes, upcomingApptsRes, historyRes] = await Promise.all([
            supabaseAdmin.from('clinics').select('id, name, address').eq('cliente_id', clientTenantId),
            supabaseAdmin.from('tenants').select('ai_config').eq('id', clientTenantId).single(),
            supabaseAdmin.from('appointments').select('id, start_time, end_time, status, clinic_id')
                .eq('client_id', client.id)
                .gte('start_time', now)
                .neq('status', 'cancelled')
                .order('start_time', { ascending: true })
                .limit(5),
            supabaseAdmin.from('messages').select('role, content')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false })
                .limit(10)
        ]);

        const clinics = clinicsRes.data;
        const tenantConfig = tenantConfigRes.data;
        const upcomingAppointments = upcomingApptsRes.data;
        const history = historyRes.data;

        // 2c. Load tenant's custom AI config for personalization
        let customUserPrompt = '';
        if (tenantConfig?.ai_config?.user_prompt) {
            customUserPrompt = `\n\n🎯 INSTRUCCIONES ADICIONALES DEL CLIENTE (PERSONALIZADAS):\n${tenantConfig.ai_config.user_prompt}`;
            console.log(`[AGENT] Using custom user_prompt from tenant config`);
        }

        let preferredClinicName = "Ninguna";
        if (client.preferred_clinic_id && clinics) {
            const pref = clinics.find(c => c.id === client.preferred_clinic_id);
            if (pref) preferredClinicName = pref.name;
        }

        const clinicsContext = clinics && clinics.length > 0
            ? `\n\n🏥 CLÍNICAS DISPONIBLES (SEDES):\n${clinics.map(c => `- ${c.name} (${c.address}) -> ID: ${c.id}`).join('\n')}\n` +
            `\nPREFERENCIA DEL CLIENTE: ${preferredClinicName}.\n` +
            `REGLA DE PREFERENCIA: Si la preferencia NO es "Ninguna", ASUME esa sede por defecto salvo que el usuario diga lo contrario. Evita preguntar.`
            : "\n\n(No hay clínicas configuradas, asume sede única)";

        // Build client context for AI
        const clientName = client.name && !client.name.startsWith('Paciente ') ? client.name : null;
        const clientEmail = (client as any).email || null;

        let clientContext = '\n\n📋 INFORMACIÓN DEL PACIENTE ACTUAL:';
        if (clientName) {
            clientContext += `\n- Nombre: ${clientName}`;
        } else {
            clientContext += `\n- Nombre: Desconocido (pregunta nombre y apellidos)`;
        }
        if (clientEmail) {
            clientContext += `\n- Email: ${clientEmail}`;
        } else {
            clientContext += `\n- Email: No registrado (preguntar si es necesario para agendar)`;
        }
        clientContext += `\n- Teléfono: Ya lo tenemos (${userId})`;

        // Add upcoming appointments info
        if (upcomingAppointments && upcomingAppointments.length > 0) {
            clientContext += '\n\n📅 CITAS PRÓXIMAS DE ESTE PACIENTE:';
            for (const appt of upcomingAppointments) {
                const apptDate = new Date(appt.start_time);
                const formattedDate = apptDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Europe/Madrid'
                });
                const formattedTime = apptDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Madrid'
                });
                const clinicName = clinics?.find(c => c.id === appt.clinic_id)?.name || 'sede principal';
                clientContext += `\n- ${formattedDate} a las ${formattedTime} en ${clinicName} (ID: ${appt.id})`;
            }
            clientContext += '\n\nIMPORTANTE: Si el paciente quiere cambiar una cita, usa reschedule_appointment con la fecha ORIGINAL de la cita existente.';
        } else {
            clientContext += '\n\n📅 Este paciente NO tiene citas próximas.';
        }

        const chatHistory: ChatCompletionMessageParam[] = history ? history.reverse().map((msg: any) => ({
            role: msg.role === 'client' ? 'user' : (msg.role === 'model' ? 'assistant' : 'assistant'),
            content: msg.content
        })) : [];

        // Save incoming user message with tenant!
        await supabaseAdmin.from('messages').insert({
            client_id: client.id,
            role: 'user',
            content: message,
            cliente_id: clientTenantId // ✅ Include tenant!
        });

        // Prepare message list
        let messages: ChatCompletionMessageParam[] = [
            { role: "system", content: SYSTEM_INSTRUCTION + clinicsContext + clientContext + customUserPrompt },
            ...chatHistory,
            { role: "user", content: message }
        ];

        await logStep('CALLING_OPENAI', { messages_length: messages.length });

        // 3. Main Loop for Tool Calling
        let finalResponseText = "";
        let turns = 0;
        const MAX_TURNS = 5;

        while (turns < MAX_TURNS) {
            const runner = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: messages,
                tools: crmTools,
                tool_choice: "auto"
            });

            const msg = runner.choices[0].message;
            messages.push(msg);

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                console.log(`🔧 Tool Call(s) Detected: ${msg.tool_calls.length}`);

                for (const toolCall of msg.tool_calls) {
                    if (toolCall.type !== 'function') continue;
                    const args = JSON.parse(toolCall.function.arguments);
                    let toolResult;

                    console.log(`   > Executing ${toolCall.function.name}...`);

                    if (toolCall.function.name === 'check_calendar_availability') {
                        const clinicToCheck = args.clinicId || (client as any).preferred_clinic_id;
                        toolResult = await checkCalendarAvailability(args.date, clinicToCheck, clientTenantId);
                    } else if (toolCall.function.name === 'book_appointment') {
                        if (!client) throw new Error("Client logic failure");
                        const finalClinicId = args.clinicId || (client as any).preferred_clinic_id;
                        // Pass tenantId, fullName, email, and phone (userId) to bookAppointment!
                        toolResult = await bookAppointment(
                            client.id,
                            args.start_time,
                            args.reason,
                            finalClinicId,
                            clientTenantId,
                            args.full_name,
                            args.email,
                            userId // WhatsApp ID is the phone number
                        );

                        if (toolResult.success) {
                            console.log("   > Booking successful");
                            if (finalClinicId && finalClinicId !== (client as any).preferred_clinic_id) {
                                console.log(`   > Updating Sticky Preference to ${finalClinicId}`);
                                await supabaseAdmin.from('clients')
                                    .update({ preferred_clinic_id: finalClinicId })
                                    .eq('id', client.id);
                            }
                        }
                    } else if (toolCall.function.name === 'search_knowledge_base') {
                        toolResult = await searchKnowledgeBase(args.query, clientTenantId);
                    } else if (toolCall.function.name === 'cancel_appointment') {
                        if (!client) throw new Error("Client logic failure");
                        toolResult = await cancel_appointment(client.id, args.date);
                    } else if (toolCall.function.name === 'reschedule_appointment') {
                        if (!client) throw new Error("Client logic failure");
                        const finalClinicId = args.clinicId || (client as any).preferred_clinic_id;
                        toolResult = await reschedule_appointment(
                            client.id,
                            args.original_date,
                            args.new_start_time,
                            finalClinicId,
                            clientTenantId
                        );
                    }

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult)
                    });
                }
            } else {
                finalResponseText = msg.content || "";
                break;
            }
            turns++;
        }

        // 4. Send Response via WhatsApp
        if (finalResponseText && client) {
            console.log(`🤖 AI Response: ${finalResponseText}`);
            await logStep('SENDING_WHATSAPP', { text: finalResponseText });

            // Prepare WhatsApp credentials override if available in tenant config
            let whatsappCreds;
            if (tenantConfig?.ai_config?.whatsapp_keys?.phone_id && tenantConfig.ai_config.whatsapp_keys.access_token) {
                whatsappCreds = {
                    phoneId: tenantConfig.ai_config.whatsapp_keys.phone_id,
                    token: tenantConfig.ai_config.whatsapp_keys.access_token
                };
            }

            await sendWhatsAppMessage(userId, finalResponseText, whatsappCreds);
            await logStep('WHATSAPP_SENT_OK');
            await supabaseAdmin.from('messages').insert({
                client_id: client.id,
                role: 'assistant',
                content: finalResponseText,
                cliente_id: clientTenantId // ✅ Include tenant!
            });
            return finalResponseText;
        }
    } catch (error: any) {
        console.error('Brain Error (OpenAI/Processing):', error);
        await logStep('CRITICAL_ERROR', { error: error.message, stack: error.stack });
        return null;
    }
}
