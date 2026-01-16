
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processUserMessage } from '@/brain/agent';

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'antigravity_secret_token';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;

        // Diagnostic Mode
        if (searchParams.get('debug') === 'true') {
            const diag = {
                status: 'ok',
                timestamp: new Date().toISOString(),
                env: {
                    HAS_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                    HAS_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    VERIFY_TOKEN_READY: !!process.env.WHATSAPP_VERIFY_TOKEN
                }
            };
            return new Response(JSON.stringify(diag), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Log verification attempt (optional but helpful)
            try {
                const supabase = getSupabaseAdmin();
                await supabase.from('webhook_logs').insert({
                    method: 'GET_VERIFY',
                    url: req.url,
                    status_code: 200
                });
            } catch (e) { console.error('Silent log fail', e); }

            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return new Response('Invalid Request', { status: 400 });
    } catch (e: any) {
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const supabase = getSupabaseAdmin();

        // Log incoming POST
        await supabase.from('webhook_logs').insert({
            method: 'POST',
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

            try {
                await processUserMessage(from, text);
            } catch (err: any) {
                console.error("Agent Error:", err);
                try {
                    const supabaseAsync = getSupabaseAdmin();
                    await supabaseAsync.from('webhook_logs').insert({
                        method: 'POST_AGENT_ERROR',
                        error: err.message,
                        body: { from, text }
                    });
                } catch (logErr) {
                    console.error('Failed to log agent error:', logErr);
                }
            }
        }

        return new Response('EVENT_RECEIVED', { status: 200 });

    } catch (error: any) {
        console.error('Error processing webhook POST:', error);
        try {
            const supabaseCatch = getSupabaseAdmin();
            await supabaseCatch.from('webhook_logs').insert({
                method: 'POST_INTERNAL_ERROR',
                error: error.message
            });
        } catch (logErr) {
            console.error('Failed to log POST error:', logErr);
        }
        return new Response('Internal Server Error', { status: 500 });
    }
}
