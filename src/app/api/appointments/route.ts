import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    console.log('[API Appointments] POST Started');
    try {
        const body = await request.json();
        console.log('[API Appointments] Body:', body);

        // Basic validation
        if (!body.client_id || !body.start_time) {
            console.error('[API Appointments] Missing fields:', { client_id: body.client_id, start_time: body.start_time });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const payload = {
            client_id: body.client_id,
            cliente_id: body.cliente_id || body.tenantId,
            clinic_id: body.clinic_id || null,
            doctor_id: body.doctor_id || null,
            start_time: body.start_time,
            end_time: body.end_time,
            status: body.status || 'scheduled'
        };
        console.log('[API Appointments] Payload to insert:', payload);

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert([payload])
            .select();

        if (error) {
            console.error('[API Appointments] Supabase Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[API Appointments] POST Success:', data);
        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('[API Appointments] Catch Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('[API Appointments] PUT Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[API Appointments] DELETE Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
