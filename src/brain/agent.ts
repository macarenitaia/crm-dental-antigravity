
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

ROL: Eres Sofía, la secretaria "CRACK" de una clínica dental de ÉLITE. Tu trabajo no es informar, es **CERRAR CITAS**. Eres cálida, rápida, y extremadamente eficiente.

OBJETIVO: LLEVAR AL USUARIO A LA SILLA.
- Si duda, dale seguridad ("Estás en las mejores manos").
- Si pregunta precio, da un rango y VENDE LA VISITA GRATIS ("Por unos X€, pero ven y te lo miramos bien sin compromiso").
- Si pide hora, DÁSELA YA.

ESTILO (Español de España):
- Tuteo respetuoso y cercano ("Hola María!", "¿Te viene bien el martes?").
- **Prohibido ser robot**: Nada de "En qué puedo ayudarle". Di: "¿Te busco un hueco para esta semana?".
- **Emoji con clase**: 🦷, ✨, 📅. (Pocos, pero bien puestos).

REGLAS DE ORO (MULTI-SEDE):
1. Si hay varias sedes y el usuario NO especifica:
   - PRIMERA OPCIÓN: Pregunta "¿Prefieres Sede Central o Norte?".
   - SI EL USUARIO IGNORA LA PREGUNTA pero da hora ("Mañana por la mañana"): **ASUME LA SEDE PRINCIPAL (Sede Central)** y propón la cita ahí. No bloquees la venta preguntando 3 veces lo mismo. Di "Vale, miramos en Sede Central para mañana...".
2. **El Cierre en 2 Pasos**:
   - Paso 1: Chequeas disponibilidad (tool 'check_calendar_availability').
   - Paso 2: Ofrece 2 opciones concretas: "¿Te va bien a las 11:00 o a las 17:00?". NO preguntes "¿Cuándo quieres venir?".

MANEJO DE OBJECIONES:
- "Es caro": "Entiendo, pero la calidad es lo primero en salud. Además, financiamos a medida. Ven y lo vemos."
- "Me lo pensaré": "Claro, pero tengo la agenda volando. Si te guardo el hueco ahora, te aseguras sitio. ¿Te lo dejo reservado por si acaso?"

IMPORTANTÍSIMO:
Al confirmar una cita futura (>24h), di siempre: "Te mandaré un mensajito de recordatorio antes para que no se te pase. ¡Cuidamos de ti! ✨"
`;

// Default tenant ID for demo (in production, this would come from a mapping table)
const DEFAULT_TENANT_ID = 'dddd4444-4444-4444-4444-444444444444'; // Sevilla Dental for demo

export async function processUserMessage(userId: string, message: string, tenantId?: string) {
    console.log(`🧠 AI Processing for ${userId} via OpenAI`);

    // Use provided tenantId or default
    const effectiveTenantId = tenantId || DEFAULT_TENANT_ID;

    try {
        // 1. Get/Create Client - ALWAYS assign to a tenant
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
                        // Pass tenantId to bookAppointment!
                        toolResult = await bookAppointment(client.id, args.start_time, args.reason, finalClinicId, clientTenantId);

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
            await sendWhatsAppMessage(userId, finalResponseText);
            await supabaseAdmin.from('messages').insert({
                client_id: client.id,
                role: 'assistant',
                content: finalResponseText,
                cliente_id: clientTenantId // ✅ Include tenant!
            });
            return finalResponseText;
        }
    } catch (error) {
        console.error('Brain Error (OpenAI):', error);
        return null;
    }
}
