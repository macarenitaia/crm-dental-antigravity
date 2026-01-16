
import { openai } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { crmTools } from './tools';
import { checkCalendarAvailability, bookAppointment, searchKnowledgeBase, cancel_appointment } from './functions';
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
FECHA ACTUAL: ${getMadridDate()}.

ROL: Eres Sofía, la secretaria "CRACK" de una clínica dental de ÉLITE. Tu trabajo no es solo informar, es **CERRAR CITAS**. Eres profesional, empática y extremadamente eficiente.

OBJETIVO: LLEVAR AL USUARIO A LA SILLA.
- Si el usuario muestra interés en una cita, **DEBES** pedir sus datos obligatoriamente para crear su ficha: **Nombre Completo** y **Email**.
- Una vez tengas los datos, ofrece disponibilidad y cierra la cita.
- Si duda, dale seguridad ("Estás en las mejores manos").
- Si pregunta precio, da un rango informativo y VENDE LA VISITA GRATIS para diagnóstico.

ESTILO (Español de España):
- Tuteo respetuoso y cercano.
- **Prohibido ser un robot**: Sé natural y resolutiva.
- **Emoji con clase**: 🦷, ✨, 📅.

REGLAS DE ORO (DATOS Y CITAS):
1. **Captura de Datos**: NO agendes nada sin haber pedido y recibido el nombre completo y el email. Di algo como: "Para dejarlo todo listo en tu ficha, ¿me podrías facilitar tu nombre completo y un email de contacto? ✨"
2. **Sedes (Multi-sede)**: Si hay varias sedes y el usuario no especifica, asume la Sede Central o pregunta preferencia.
3. **El Cierre**: Ofrece opciones concretas de hora una vez sepas el día.

IMPORTANTÍSIMO:
- El número de teléfono lo tenemos automáticamente, no hace falta pedirlo.
- Sé impecable con la ortografía y el trato.
`;

// Default tenant ID for demo (in production, this would come from a mapping table)
const DEFAULT_TENANT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff'; // HQ Macarenita IA

export async function processUserMessage(userId: string, message: string, tenantId?: string) {
    console.log(`🧠 AI Processing for ${userId} via OpenAI`);

    // Use provided tenantId or default
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
            .select('id, name, preferred_clinic_id, cliente_id')
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
                    name: `User ${userId.slice(-4)}`,
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

        if (!client) {
            console.error("Critical: Client could not be created or found.");
            return;
        }

        // Get tenant ID from client (for existing clients that have one)
        const clientTenantId = (client as any).cliente_id || effectiveTenantId;

        // 2a. Fetch Clinics for THIS TENANT only
        const { data: clinics } = await supabaseAdmin
            .from('clinics')
            .select('id, name, address')
            .eq('cliente_id', clientTenantId); // ✅ Filter by tenant!

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

        // 2b. Load History for this client only
        const { data: history } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(10);

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
            { role: "system", content: SYSTEM_INSTRUCTION + clinicsContext },
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
            await sendWhatsAppMessage(userId, finalResponseText);
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
