
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateReschedulingProposal(
    patientName: string,
    doctorName: string,
    clinicName: string,
    availableSlots: string[],
    customPrompt?: string
) {
    const slotsList = availableSlots.map(s => `- ${s}`).join('\n');

    const defaultPrompt = `
Eres la secretaria virtual de la clínica dental "${clinicName}". 
El paciente ${patientName} ha pedido reprogramar su cita con el Dr. ${doctorName}.
Tu objetivo es ser persuasivo/a y empático/a, recordando al paciente que su salud es lo primero y que es importante no retrasar el tratamiento.

Aquí tienes los huecos disponibles en la sede (ignora si el doctor es diferente, propón estos huecos como opciones de la clínica):
${slotsList}

Redacta un mensaje de WhatsApp corto y profesional (máximo 300 caracteres).
No uses placeholders como "[Nombre]", usa los datos proporcionados. 
Incluye los huecos de forma clara. 
Termina preguntando cuál le va mejor.
`.trim();

    const finalPrompt = customPrompt
        ? customPrompt
            .replace('{patient_name}', patientName)
            .replace('{doctor_name}', doctorName)
            .replace('{clinic_name}', clinicName)
            .replace('{available_slots}', slotsList)
        : defaultPrompt;

    console.log(`--- [AI] Generating proposal for ${patientName} using ${customPrompt ? 'CUSTOM' : 'DEFAULT'} prompt...`);

    const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
            { role: "system", content: "Eres una secretaria de clínica dental experta en gestión de citas y persuasión amable." },
            { role: "user", content: finalPrompt }
        ],
        temperature: 0.7,
        max_tokens: 250
    });

    console.log(`--- [AI] Proposal generated successfully.`);

    return response.choices[0].message.content || '';
}
