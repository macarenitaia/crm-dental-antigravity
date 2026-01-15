
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { processUserMessage } from '@/brain/agent';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'antigravity_secret_token';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Diagnostics Mode
    if (req.query.debug === 'true') {
        return res.status(200).json({
            status: 'ok',
            source: 'pages-router',
            timestamp: new Date().toISOString(),
            env: {
                HAS_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                VERIFY_TOKEN_READY: !!process.env.WHATSAPP_VERIFY_TOKEN
            }
        });
    }

    // 2. GET: WhatsApp Verification
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED (Pages Router)');

            // Log attempt to database
            try {
                const supabase = getSupabaseAdmin();
                await supabase.from('webhook_logs').insert({
                    method: 'GET_PAGES',
                    url: req.url,
                    status_code: 200,
                    response_body: challenge
                });
            } catch (e) { console.error('Log failed', e); }

            return res.status(200).send(challenge);
        }

        return res.status(403).send('Forbidden');
    }

    // 3. POST: Message Processing
    if (req.method === 'POST') {
        try {
            const body = req.body;
            const supabase = getSupabaseAdmin();

            // Log incoming payload
            await supabase.from('webhook_logs').insert({
                method: 'POST_PAGES',
                url: req.url,
                body: body
            });

            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message && message.type === 'text') {
                const from = message.from;
                const text = message.text.body;

                // Process AI in background
                processUserMessage(from, text).catch(async (err) => {
                    console.error("Agent Error:", err);
                    try {
                        const supabaseAsync = getSupabaseAdmin();
                        await supabaseAsync.from('webhook_logs').insert({
                            method: 'POST_AGENT_ERROR_PAGES',
                            error: err.message,
                            body: { from, text }
                        });
                    } catch (logErr) {
                        console.error('Failed to log agent error:', logErr);
                    }
                });
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (error: any) {
            console.error('Webhook POST Error (Pages):', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).send('Method Not Allowed');
}
