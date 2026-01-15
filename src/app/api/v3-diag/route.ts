
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const debug = url.searchParams.get('debug');

    const data = {
        status: 'ok',
        msg: 'V3 Diagnostic Reached',
        timestamp: new Date().toISOString(),
        url: req.url,
        query: Object.fromEntries(url.searchParams.entries()),
        env_keys: {
            SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            WHATSAPP_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN
        }
    };

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}
