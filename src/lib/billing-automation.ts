/**
 * BILLING AUTOMATION LIBRARY
 * ==========================
 * - Auto-generación de facturas al completar citas
 * - Sistema de recordatorios de pago
 * - Predicción de flujo de caja
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

// Types
export interface Invoice {
    id: string;
    invoice_number: string;
    cliente_id: string;
    client_id: string;
    appointment_id?: string;
    clinic_id?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
    issue_date: string;
    due_date: string;
    paid_amount: number;
    send_method?: 'email' | 'whatsapp' | 'both' | 'none';
    notes?: string;
    created_at: string;
}

export interface InvoiceItem {
    id: string;
    invoice_id: string;
    description: string;
    treatment_type?: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    total: number;
}

export interface Payment {
    id: string;
    invoice_id: string;
    cliente_id: string;
    amount: number;
    method: 'cash' | 'card' | 'transfer' | 'bizum' | 'financing' | 'other';
    reference?: string;
    notes?: string;
    created_at: string;
}

// ============================================
// INVOICE GENERATION
// ============================================

/**
 * Genera número de factura único para un tenant
 */
async function generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;

    // Obtener último número
    const { data } = await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .eq('cliente_id', tenantId)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

    let nextNum = 1;
    if (data && data.length > 0) {
        const lastNum = parseInt(data[0].invoice_number.split('-').pop() || '0');
        nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
}

/**
 * Crea factura automáticamente al completar una cita
 */
export async function createInvoiceFromAppointment(
    appointmentId: string,
    items: Array<{ description: string; unitPrice: number; quantity?: number; treatmentType?: string }>
): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    try {
        // 1. Obtener datos de la cita
        const { data: appointment, error: apptError } = await supabaseAdmin
            .from('appointments')
            .select(`
                id,
                client_id,
                clinic_id,
                cliente_id,
                clients(name, whatsapp_id)
            `)
            .eq('id', appointmentId)
            .single();

        if (apptError || !appointment) {
            return { success: false, error: 'Cita no encontrada' };
        }

        // 2. Generar número de factura
        const invoiceNumber = await generateInvoiceNumber(appointment.cliente_id);

        // 3. Calcular totales
        const subtotal = items.reduce((sum, item) =>
            sum + (item.unitPrice * (item.quantity || 1)), 0);
        const taxRate = 0; // 0% exento por ley sanitaria
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        // 4. Crear factura
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .insert({
                invoice_number: invoiceNumber,
                cliente_id: appointment.cliente_id,
                client_id: appointment.client_id,
                appointment_id: appointmentId,
                clinic_id: appointment.clinic_id,
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total,
                status: 'draft',
                issue_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            .select()
            .single();

        if (invoiceError || !invoice) {
            return { success: false, error: `Error creando factura: ${invoiceError?.message}` };
        }

        // 5. Crear líneas de factura
        const invoiceItems = items.map((item, idx) => ({
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

        console.log(`✅ Factura ${invoiceNumber} creada para cita ${appointmentId}`);

        return { success: true, invoice };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================
// PAYMENT REGISTRATION
// ============================================

/**
 * Registra un pago para una factura
 */
export async function registerPayment(
    invoiceId: string,
    amount: number,
    method: Payment['method'],
    reference?: string,
    notes?: string
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    try {
        // Obtener factura
        const { data: invoice } = await supabaseAdmin
            .from('invoices')
            .select('id, cliente_id, total, paid_amount')
            .eq('id', invoiceId)
            .single();

        if (!invoice) {
            return { success: false, error: 'Factura no encontrada' };
        }

        // Registrar pago
        const { data: payment, error } = await supabaseAdmin
            .from('payments')
            .insert({
                invoice_id: invoiceId,
                cliente_id: invoice.cliente_id,
                amount,
                method,
                reference,
                notes
            })
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }

        // El trigger se encarga de actualizar paid_amount y status

        return { success: true, payment };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ============================================
// BILLING STATS & KPIs
// ============================================

export interface BillingStats {
    invoicedThisMonth: number;
    invoicedLastMonth: number;
    pendingCollection: number;
    overdueAmount: number;
    collectionRate: number; // % cobrado vs facturado
    averageInvoice: number;
    invoiceCount: number;
    paymentsByMethod: Record<string, number>;
}

/**
 * Obtiene estadísticas de facturación para un tenant
 */
/**
 * Obtiene estadísticas de facturación para un tenant
 * OPTIMIZADO: Usa RPC de PostgreSQL para cálculo en servidor
 */
export async function getBillingStats(tenantId: string): Promise<BillingStats> {
    const { data, error } = await supabaseAdmin
        .rpc('get_billing_stats', { input_tenant_id: tenantId });

    if (error) {
        console.error('Error fetching billing stats:', error);
        return {
            invoicedThisMonth: 0,
            invoicedLastMonth: 0,
            pendingCollection: 0,
            overdueAmount: 0,
            collectionRate: 0,
            averageInvoice: 0,
            invoiceCount: 0,
            paymentsByMethod: {}
        };
    }

    return data as BillingStats;
}

// ============================================
// CASH FLOW PREDICTION
// ============================================

export interface CashFlowForecast {
    month: string;
    expectedIncome: number;
    historicalAverage: number;
    confidence: 'high' | 'medium' | 'low';
    breakdown: {
        fromScheduledAppointments: number;
        fromPendingInvoices: number;
        fromHistoricalTrend: number;
    };
}

/**
 * Predice el flujo de caja del próximo mes
 */
export async function predictCashFlow(tenantId: string): Promise<CashFlowForecast> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    // 1. Citas programadas para el próximo mes
    const { data: scheduledAppts } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('cliente_id', tenantId)
        .gte('start_time', nextMonth.toISOString())
        .lte('start_time', nextMonthEnd.toISOString())
        .in('status', ['scheduled', 'confirmed']);

    // Estimación media por cita (basada en histórico)
    const { data: historicalInvoices } = await supabaseAdmin
        .from('invoices')
        .select('total')
        .eq('cliente_id', tenantId)
        .neq('status', 'cancelled')
        .limit(50);

    const avgInvoice = historicalInvoices?.length
        ? historicalInvoices.reduce((s, i) => s + parseFloat(i.total), 0) / historicalInvoices.length
        : 100;

    const fromScheduledAppointments = (scheduledAppts?.length || 0) * avgInvoice;

    // 2. Facturas pendientes que vencen el próximo mes
    const { data: pendingInvoices } = await supabaseAdmin
        .from('invoices')
        .select('total, paid_amount')
        .eq('cliente_id', tenantId)
        .in('status', ['sent', 'partial'])
        .gte('due_date', nextMonth.toISOString().split('T')[0])
        .lte('due_date', nextMonthEnd.toISOString().split('T')[0]);

    const fromPendingInvoices = pendingInvoices?.reduce(
        (s, i) => s + (parseFloat(i.total) - parseFloat(i.paid_amount)), 0
    ) || 0;

    // 3. Media histórica de los últimos 3 meses
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const { data: last3Months } = await supabaseAdmin
        .from('invoices')
        .select('total, issue_date')
        .eq('cliente_id', tenantId)
        .gte('issue_date', threeMonthsAgo.toISOString().split('T')[0])
        .eq('status', 'paid');

    const historicalAverage = last3Months?.length
        ? last3Months.reduce((s, i) => s + parseFloat(i.total), 0) / 3
        : 0;

    // Calcular predicción final (ponderada)
    const expectedIncome = (
        fromScheduledAppointments * 0.5 +
        fromPendingInvoices * 0.3 +
        historicalAverage * 0.2
    );

    // Determinar confianza
    const dataPoints = (scheduledAppts?.length || 0) + (pendingInvoices?.length || 0) + (last3Months?.length || 0);
    const confidence = dataPoints > 20 ? 'high' : dataPoints > 5 ? 'medium' : 'low';

    return {
        month: nextMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        expectedIncome: Math.round(expectedIncome * 100) / 100,
        historicalAverage: Math.round(historicalAverage * 100) / 100,
        confidence,
        breakdown: {
            fromScheduledAppointments: Math.round(fromScheduledAppointments * 100) / 100,
            fromPendingInvoices: Math.round(fromPendingInvoices * 100) / 100,
            fromHistoricalTrend: Math.round(historicalAverage * 100) / 100
        }
    };
}

// ============================================
// PROFITABILITY BY TREATMENT/DOCTOR
// ============================================

export interface ProfitabilityData {
    byTreatment: Array<{ treatment: string; total: number; count: number; average: number }>;
    byDoctor: Array<{ doctor: string; total: number; count: number; average: number }>;
    byClinic: Array<{ clinic: string; total: number; count: number; average: number }>;
}

/**
 * Obtiene datos de rentabilidad para gráficos
 */
export async function getProfitabilityData(tenantId: string, months: number = 6): Promise<ProfitabilityData> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Por tratamiento
    const { data: items } = await supabaseAdmin
        .from('invoice_items')
        .select(`
            treatment_type,
            total,
            invoices!inner(cliente_id, issue_date, status)
        `)
        .eq('invoices.cliente_id', tenantId)
        .gte('invoices.issue_date', startDate.toISOString().split('T')[0])
        .neq('invoices.status', 'cancelled');

    // Por clínica
    const { data: invoicesByClinic } = await supabaseAdmin
        .from('invoices')
        .select(`
            total,
            clinics(name)
        `)
        .eq('cliente_id', tenantId)
        .gte('issue_date', startDate.toISOString().split('T')[0])
        .neq('status', 'cancelled')
        .not('clinic_id', 'is', null);

    // Agrupar por tratamiento
    const treatmentMap = new Map<string, { total: number; count: number }>();
    items?.forEach(item => {
        const key = item.treatment_type || 'General';
        const current = treatmentMap.get(key) || { total: 0, count: 0 };
        treatmentMap.set(key, {
            total: current.total + parseFloat(item.total),
            count: current.count + 1
        });
    });

    // Agrupar por clínica
    const clinicMap = new Map<string, { total: number; count: number }>();
    invoicesByClinic?.forEach(inv => {
        const key = (inv.clinics as any)?.name || 'Sin sede';
        const current = clinicMap.get(key) || { total: 0, count: 0 };
        clinicMap.set(key, {
            total: current.total + parseFloat(inv.total),
            count: current.count + 1
        });
    });

    return {
        byTreatment: Array.from(treatmentMap.entries()).map(([treatment, data]) => ({
            treatment,
            total: Math.round(data.total * 100) / 100,
            count: data.count,
            average: Math.round((data.total / data.count) * 100) / 100
        })).sort((a, b) => b.total - a.total),

        byDoctor: [], // TODO: Añadir cuando haya tabla doctors asociada a invoices

        byClinic: Array.from(clinicMap.entries()).map(([clinic, data]) => ({
            clinic,
            total: Math.round(data.total * 100) / 100,
            count: data.count,
            average: Math.round((data.total / data.count) * 100) / 100
        })).sort((a, b) => b.total - a.total)
    };
}
