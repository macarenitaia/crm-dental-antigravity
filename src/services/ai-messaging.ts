import { openai } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp-service';

interface MessagingContext {
    patient_name: string;
    appointment_date: string;
    appointment_time: string;
    clinic_name: string;
    doctor_name?: string;
}

/**
 * generates and sends a personalized message to a patient using AI and WhatsApp
 */
export async function sendAIPatientMessage(
    tenant_id: string,
    to_phone: string,
    context: MessagingContext
) {
    console.log(`[AI Messaging] Starting process for tenant ${tenant_id} to ${to_phone}...`);

    try {
        // 1. Retrieve Config and Keys from the new tables
        // If not found in new tables, we could fallback to tenants.ai_config, 
        // but since we just activated the new tables, we prioritize them.
        const [aiRes, waRes] = await Promise.all([
            supabaseAdmin
                .from('ai_config_settings')
                .select('custom_prompt')
                .eq('tenant_id', tenant_id)
                .single(),
            supabaseAdmin
                .from('whatsapp_settings')
                .select('phone_number_id, access_token')
                .eq('tenant_id', tenant_id)
                .single()
        ]);

        if (aiRes.error || !aiRes.data?.custom_prompt) {
            throw new Error('AI Configuration not found for this tenant');
        }

        if (waRes.error || !waRes.data?.access_token) {
            throw new Error('WhatsApp Credentials not found for this tenant');
        }

        const customPrompt = aiRes.data.custom_prompt;
        const { phone_number_id, access_token } = waRes.data;

        // 2. Build the AI context
        const userPrompt = `
Contexto de la Cita:
- Paciente: ${context.patient_name}
- Fecha: ${context.appointment_date}
- Hora: ${context.appointment_time}
- Clínica: ${context.clinic_name}
- Doctor: ${context.doctor_name || 'No asignado'}

Basándote en tus reglas de personalidad, genera un mensaje breve y profesional para el paciente. Solo devuelve el texto del mensaje, sin introducciones ni comentarios adicionales.
`;

        // 3. Generate content via OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: customPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
        });

        const generatedMessage = completion.choices[0].message?.content;
        if (!generatedMessage) {
            throw new Error('Failed to generate message content via AI');
        }

        console.log(`[AI Messaging] AI Generated Message: "${generatedMessage}"`);

        // 4. Send via WhatsApp using dynamic credentials
        const result = await sendWhatsAppTextMessage(
            to_phone,
            generatedMessage,
            {
                phoneId: phone_number_id,
                token: access_token
            }
        );

        return {
            success: true,
            message: generatedMessage,
            whatsapp_result: result
        };

    } catch (error: any) {
        console.error('[AI Messaging] Error:', error.message);
        throw error;
    }
}
