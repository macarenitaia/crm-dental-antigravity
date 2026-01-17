
const ENV_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const ENV_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

interface WhatsAppCredentials {
    phoneId: string;
    token: string;
}

export async function sendWhatsAppMessage(to: string, message: string, creds?: WhatsAppCredentials): Promise<any> {
    const phoneId = creds?.phoneId || ENV_PHONE_ID;
    const token = creds?.token || ENV_TOKEN;

    if (!phoneId || !token) {
        console.error('Missing WhatsApp Credentials (env or passed)');
        throw new Error('Missing WhatsApp Credentials');
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${phoneId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: { body: message },
                }),
            }
        );

        const data = await response.json();
        if (!response.ok) {
            console.error('WhatsApp API Error:', data);
            throw new Error(data.error?.message || 'Error sending WhatsApp');
        }
        console.log('Message sent:', data);
        return data;
    } catch (error) {
        console.error('Network Error Sending WhatsApp:', error);
        throw error;
    }
}
