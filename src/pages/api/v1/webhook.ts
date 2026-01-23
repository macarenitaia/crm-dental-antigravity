
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
        const supabase = getSupabaseAdmin();

        try {
            const body = req.body;

            // Log incoming payload FIRST
            await supabase.from('webhook_logs').insert({
                method: 'POST_PAGES',
                url: req.url,
                body: body
            });

            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            // Skip status updates (only process actual messages)
            if (value?.statuses) {
                return res.status(200).send('STATUS_RECEIVED');
            }

            if (message && message.type === 'text') {
                const from = message.from;
                const text = message.text.body;

                // Match tenant by phone_number_id
                const phoneNumberId = value?.metadata?.phone_number_id;
                let tenantId: string | null = null;
                if (phoneNumberId) {
                    const { data: tenants } = await supabase
                        .from('tenants')
                        .select('id, ai_config')
                        .eq('active', true);
                    const matchingTenant = tenants?.find(t =>
                        t.ai_config?.whatsapp_keys?.phone_id === phoneNumberId
                    );
                    if (matchingTenant) tenantId = matchingTenant.id;
                }

                try {
                    const agentResponse = await processUserMessage(from, text, undefined, tenantId);

                    // Log successful response
                    await supabase.from('webhook_logs').insert({
                        method: 'POST_AGENT_SUCCESS',
                        body: { from, text, response: agentResponse?.substring(0, 200) }
                    });
                } catch (agentErr: any) {
                    console.error("Agent Error:", agentErr);
                    await supabase.from('webhook_logs').insert({
                        method: 'POST_AGENT_ERROR',
                        error: agentErr.message,
                        body: { from, text, stack: agentErr.stack?.substring(0, 500) }
                    });
                }
            }

            return res.status(200).send('EVENT_RECEIVED');
        } catch (error: any) {
            console.error('Webhook POST Error (Pages):', error);
            // Log the error
            try {
                await supabase.from('webhook_logs').insert({
                    method: 'POST_FATAL_ERROR',
                    error: error.message,
                    body: { stack: error.stack?.substring(0, 500) }
                });
            } catch (logErr) { /* silent */ }
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).send('Method Not Allowed');
}
