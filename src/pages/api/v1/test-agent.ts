import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const results: any = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // 1. Check ALL environment variables
    results.env = {
        SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY?.substring(0, 10) + '...',
        WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || 'NOT SET',
        WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
        WHATSAPP_TOKEN_PREFIX: process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 15) + '...',
    };

    // 2. Test Supabase Connection
    try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('webhook_logs').select('count').limit(1);
        results.tests.supabase = error ? `ERROR: ${error.message}` : 'OK';
    } catch (e: any) {
        results.tests.supabase = `EXCEPTION: ${e.message}`;
    }

    // 3. Test OpenAI Connection
    try {
        const OpenAI = await import('openai');
        const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Responde con la palabra OK' }],
            max_tokens: 10
        });
        results.tests.openai = response.choices[0]?.message?.content || 'No response';
    } catch (e: any) {
        results.tests.openai = `ERROR: ${e.message}`;
    }

    // 4. Test WhatsApp API (just validate, don't send)
    try {
        const phoneId = process.env.WHATSAPP_PHONE_ID;
        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!phoneId || !token) {
            results.tests.whatsapp = 'MISSING CREDENTIALS';
        } else {
            // Try to get phone number info (doesn't send anything)
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${phoneId}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const data = await response.json();
            if (data.error) {
                results.tests.whatsapp = `API ERROR: ${data.error.message}`;
            } else {
                results.tests.whatsapp = `OK - Phone: ${data.display_phone_number || data.verified_name || 'Unknown'}`;
            }
        }
    } catch (e: any) {
        results.tests.whatsapp = `EXCEPTION: ${e.message}`;
    }

    // 5. Check recent messages in DB
    try {
        const supabase = getSupabaseAdmin();
        const { data: recentMsgs } = await supabase
            .from('messages')
            .select('id, role, content, created_at')
            .order('created_at', { ascending: false })
            .limit(3);
        results.recentMessages = recentMsgs;
    } catch (e: any) {
        results.recentMessages = `ERROR: ${e.message}`;
    }

    return res.status(200).json(results);
}
