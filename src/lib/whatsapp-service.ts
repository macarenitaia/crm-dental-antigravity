/**
 * Utility to replace variables in a string
 */
function replaceVars(text: string, vars: Record<string, string>) {
    return text.replace(/{(\w+)}/g, (match, key) => {
        const lowerKey = key.toLowerCase();
        return vars[lowerKey] || vars[key] || match;
    });
}

/**
 * Sends a plain text message via WhatsApp with dynamic credentials
 */
export async function sendWhatsAppTextMessage(
    to: string,
    message: string,
    creds?: { phoneId?: string, token?: string }
) {
    const finalPhoneId = creds?.phoneId || process.env.WHATSAPP_PHONE_ID;
    const finalToken = creds?.token || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!finalPhoneId || !finalToken) {
        throw new Error('Missing WhatsApp Credentials');
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
    };

    console.log(`--- [WhatsApp] Sending text to ${to} using ${creds?.phoneId ? 'DYNAMIC' : 'ENV'} creds...`);
    const response = await fetch(
        `https://graph.facebook.com/v19.0/${finalPhoneId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${finalToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const data = await response.json();
    if (!response.ok) {
        console.error('WhatsApp API Error:', data);
        throw new Error(data.error?.message || 'Error sending WhatsApp text');
    }
    return data;
}

/**
 * Sends the confirmation template with dynamic credentials AND mapping
 */
export async function sendAppointmentConfirmationTemplate(
    to: string,
    vars: { patient_name: string, date: string, time: string, clinic_name?: string, doctor_name?: string },
    creds?: {
        phoneId?: string,
        token?: string,
        templateName?: string,
        mapping?: { header?: string[], body?: string[], buttons?: string[] }
    }
): Promise<any> {
    const finalPhoneId = creds?.phoneId || process.env.WHATSAPP_PHONE_ID;
    const finalToken = creds?.token || process.env.WHATSAPP_ACCESS_TOKEN;
    const finalTemplate = creds?.templateName || 'confirmacion_cita';

    // Default mapping if none provided
    const mapping = creds?.mapping || {
        header: ['{patient_name}'],
        body: ['{date}', '{time}']
    };

    if (!finalPhoneId || !finalToken) {
        throw new Error('Missing WhatsApp Credentials');
    }

    const components: any[] = [];

    if (mapping.header && mapping.header.length > 0) {
        components.push({
            type: 'header',
            parameters: mapping.header.map(val => ({
                type: 'text',
                text: replaceVars(val, vars)
            }))
        });
    }

    if (mapping.body && mapping.body.length > 0) {
        components.push({
            type: 'body',
            parameters: mapping.body.map(val => ({
                type: 'text',
                text: replaceVars(val, vars)
            }))
        });
    }

    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: finalTemplate,
            language: { code: 'es' },
            components: components
        }
    };

    console.log(`--- [WhatsApp] Sending Template ${finalTemplate} to ${to} with mapping...`);

    const response = await fetch(
        `https://graph.facebook.com/v19.0/${finalPhoneId}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${finalToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const data = await response.json();
    if (!response.ok) {
        console.error('WhatsApp API Error:', data);
        throw new Error(data.error?.message || 'Error sending WhatsApp template');
    }
    return data;
}
