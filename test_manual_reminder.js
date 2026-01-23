
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testManualReminder() {
    const TO = '34606523222'; // Luis Portoles
    const HQ_TENANT = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const PHONE_ID = '956875604166200';
    const TOKEN = 'EAFk6rtdZCUNoBQOaZA2ZCKhGjViXDyYfeXq1maZBGHoWdpNZBZBoI0hmEQDjDoiEAj5YCfbY0iKzzbXJbQ1yQm6IN2ZBUPyisnt84RLvzPshYESjm8rgeZCPoeS9rjOvvYfrktuisWGXa20DNp8v0PvPLfq3saQuwwDHe9aE1xgndSQrP93rRqz5Y5mufxtJvAZDZD';

    console.log(`Sending test template to ${TO}...`);

    const payload = {
        messaging_product: 'whatsapp',
        to: TO,
        type: 'template',
        template: {
            name: 'confirmacion_cita',
            language: { code: 'es_ES' },
            components: [
                {
                    type: 'header',
                    parameters: [{ type: 'text', text: 'Luis Portoles' }]
                },
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: '24/01/2026' },
                        { type: 'text', text: '11:00' }
                    ]
                }
            ]
        }
    };

    const response = await fetch(
        `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
        console.log('✅ Test reminder sent successfully!');
    } else {
        console.error('❌ Failed to send test reminder.');
    }
}

testManualReminder();
