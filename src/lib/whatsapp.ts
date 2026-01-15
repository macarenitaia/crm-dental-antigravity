
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function sendWhatsAppMessage(to: string, message: string): Promise<any> {
    if (!PHONE_ID || !TOKEN) {
        console.error('Missing WhatsApp Credentials');
        throw new Error('Missing WhatsApp Credentials');
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
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
