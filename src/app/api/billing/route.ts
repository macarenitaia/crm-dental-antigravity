/**
 * BILLING API ENDPOINTS
 * =====================
 * - GET: List invoices, get stats
 * - POST: Create invoice, register payment, send notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/billing?action=invoices|stats|forecast
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action') || 'invoices';
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    try {
        switch (action) {
            case 'invoices':
                return await getInvoices(tenantId, searchParams);
            case 'stats':
                return await getStats(tenantId);
            case 'forecast':
                return await getForecast(tenantId);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/billing
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { action, tenantId, ...data } = body;

    if (!tenantId) {
        return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    try {
        switch (action) {
            case 'create_invoice':
                return await createInvoice(tenantId, data);
            case 'register_payment':
                return await registerPayment(tenantId, data);
            case 'send_invoice':
                return await sendInvoice(tenantId, data);
            case 'update_status':
                return await updateInvoiceStatus(tenantId, data);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ============================================
// HANDLERS
// ============================================

async function getInvoices(tenantId: string, params: URLSearchParams) {
    const status = params.get('status');
    const limit = parseInt(params.get('limit') || '50');

    let query = supabaseAdmin
        .from('invoices')
        .select(`
            *,
            clients(id, name, whatsapp_id),
            clinics(id, name)
        `)
        .eq('cliente_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (status && status !== 'all') {
        if (status === 'pending') {
            query = query.in('status', ['sent', 'partial']);
        } else {
            query = query.eq('status', status);
        }
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ invoices: data });
}

async function getStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // This month
    const { data: thisMonth } = await supabaseAdmin
        .from('invoices')
        .select('total, paid_amount')
        .eq('cliente_id', tenantId)
        .gte('issue_date', startOfMonth)
        .neq('status', 'cancelled');

    // Last month
    const { data: lastMonth } = await supabaseAdmin
        .from('invoices')
        .select('total')
        .eq('cliente_id', tenantId)
        .gte('issue_date', startOfLastMonth)
        .lte('issue_date', endOfLastMonth)
        .neq('status', 'cancelled');

    // Pending
    const { data: pending } = await supabaseAdmin
        .from('invoices')
        .select('total, paid_amount')
        .eq('cliente_id', tenantId)
        .in('status', ['sent', 'partial', 'overdue']);

    // Overdue
    const { data: overdue } = await supabaseAdmin
        .from('invoices')
        .select('total, paid_amount')
        .eq('cliente_id', tenantId)
        .eq('status', 'overdue');

    const invoicedThisMonth = thisMonth?.reduce((s, i) => s + Number(i.total), 0) || 0;
    const paidThisMonth = thisMonth?.reduce((s, i) => s + Number(i.paid_amount), 0) || 0;

    return NextResponse.json({
        invoicedThisMonth,
        invoicedLastMonth: lastMonth?.reduce((s, i) => s + Number(i.total), 0) || 0,
        pendingCollection: pending?.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0) || 0,
        overdueAmount: overdue?.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0) || 0,
        collectionRate: invoicedThisMonth > 0 ? (paidThisMonth / invoicedThisMonth) * 100 : 0,
        invoiceCount: thisMonth?.length || 0
    });
}

async function getForecast(tenantId: string) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

    // Scheduled appointments for next month
    const { data: appts } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('cliente_id', tenantId)
        .gte('start_time', nextMonth.toISOString())
        .lte('start_time', nextMonthEnd.toISOString())
        .in('status', ['scheduled', 'confirmed']);

    // Historical average invoice value
    const { data: historicalInvoices } = await supabaseAdmin
        .from('invoices')
        .select('total')
        .eq('cliente_id', tenantId)
        .eq('status', 'paid')
        .limit(50);

    const avgInvoice = historicalInvoices?.length
        ? historicalInvoices.reduce((s, i) => s + Number(i.total), 0) / historicalInvoices.length
        : 80; // Default estimate

    const expectedIncome = (appts?.length || 0) * avgInvoice;

    return NextResponse.json({
        month: nextMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        expectedIncome: Math.round(expectedIncome * 100) / 100,
        scheduledAppointments: appts?.length || 0,
        confidence: (appts?.length || 0) > 10 ? 'high' : 'medium'
    });
}

async function createInvoice(tenantId: string, data: any) {
    const { clientId, appointmentId, clinicId, items } = data;

    // Generate invoice number
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;

    const { data: lastInvoice } = await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .eq('cliente_id', tenantId)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

    let nextNum = 1;
    if (lastInvoice && lastInvoice.length > 0) {
        const lastNum = parseInt(lastInvoice[0].invoice_number.split('-').pop() || '0');
        nextNum = lastNum + 1;
    }

    const invoiceNumber = `${prefix}${nextNum.toString().padStart(5, '0')}`;

    // Calculate totals
    const subtotal = items.reduce((s: number, i: any) => s + (i.unitPrice * (i.quantity || 1)), 0);
    const total = subtotal; // 0% tax

    // Create invoice
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .insert({
            invoice_number: invoiceNumber,
            cliente_id: tenantId,
            client_id: clientId,
            appointment_id: appointmentId || null,
            clinic_id: clinicId || null,
            subtotal,
            tax_rate: 0,
            tax_amount: 0,
            total,
            status: 'draft',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        .select()
        .single();

    if (error) throw error;

    // Create invoice items
    if (items && items.length > 0) {
        const invoiceItems = items.map((item: any, idx: number) => ({
            invoice_id: invoice.id,
            description: item.description,
            treatment_type: item.treatmentType || 'general',
            quantity: item.quantity || 1,
            unit_price: item.unitPrice,
            discount_percent: 0,
            total: item.unitPrice * (item.quantity || 1),
            sort_order: idx
        }));

        await supabaseAdmin.from('invoice_items').insert(invoiceItems);
    }

    return NextResponse.json({ success: true, invoice });
}

async function registerPayment(tenantId: string, data: any) {
    const { invoiceId, amount, method, reference, notes } = data;

    const { data: payment, error } = await supabaseAdmin
        .from('payments')
        .insert({
            invoice_id: invoiceId,
            cliente_id: tenantId,
            amount,
            method,
            reference,
            notes
        })
        .select()
        .single();

    if (error) throw error;

    // Trigger will update invoice paid_amount and status

    return NextResponse.json({ success: true, payment });
}

async function sendInvoice(tenantId: string, data: any) {
    const { invoiceId, method, recipient } = data;

    // Log the notification attempt
    const { data: notification, error } = await supabaseAdmin
        .from('notifications_log')
        .insert({
            invoice_id: invoiceId,
            cliente_id: tenantId,
            type: method, // 'email' or 'whatsapp'
            recipient: recipient,
            status: 'pending',
            notification_type: 'invoice'
        })
        .select()
        .single();

    if (error) throw error;

    // Update invoice status to 'sent'
    await supabaseAdmin
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoiceId);

    // TODO: Actual WhatsApp/Email sending logic
    // For now, just mark as sent
    await supabaseAdmin
        .from('notifications_log')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notification.id);

    return NextResponse.json({ success: true, notification });
}

async function updateInvoiceStatus(tenantId: string, data: any) {
    const { invoiceId, status } = data;

    const { error } = await supabaseAdmin
        .from('invoices')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .eq('cliente_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
}
