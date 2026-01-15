"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { createInvoiceFromTreatment } from '@/lib/treatments';
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertTriangle,
    FileText,
    CreditCard,
    Send,
    MoreHorizontal,
    Calendar,
    Building,
    ChevronRight,
    Plus,
    Filter,
    Download,
    Receipt,
    Printer,
    RotateCcw,
    XCircle,
    Check
} from 'lucide-react';
import NewInvoiceModal from '@/components/NewInvoiceModal';

// Types
interface Invoice {
    id: string;
    invoice_number: string;
    client_id: string;
    clients?: { name: string };
    clinics?: { name: string };
    total: number;
    paid_amount: number;
    status: string;
    issue_date: string;
    due_date: string;
}

interface BillingStats {
    invoicedThisMonth: number;
    invoicedLastMonth: number;
    pendingCollection: number;
    overdueAmount: number;
    collectionRate: number;
}

interface CashFlowForecast {
    month: string;
    expectedIncome: number;
    confidence: 'high' | 'medium' | 'low';
}

interface PendingTreatment {
    id: string;
    name: string;
    budget_amount: number;
    invoiced_amount: number;
    client_id: string;
    clients?: { name: string };
    status: string;
    created_at: string;
}

interface Clinic {
    id: string;
    name: string;
}

export default function BillingPage() {
    const { tenantId } = useTenant();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [pendingTreatments, setPendingTreatments] = useState<any[]>([]);
    const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [forecast, setForecast] = useState<CashFlowForecast | null>(null);
    const [sedeDropdownOpen, setSedeDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (tenantId) {
            fetchData();
        }

        // Click-outside effect for dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setSedeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [tenantId, activeTab, selectedClinicId]);

    async function fetchData() {
        // Only show loading on first load, not refreshes
        if (invoices.length === 0) {
            setLoading(true);
        }
        try {
            await Promise.all([
                fetchClinics(),
                fetchInvoices(),
                fetchPendingTreatments(),
                fetchStats(),
                fetchForecast()
            ]);
        } catch (err) {
            console.error('[BillingPage] Error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchClinics() {
        if (!tenantId) return;
        const { data } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('tenant_id', tenantId);
        if (data) setClinics(data);
    }

    async function fetchInvoices() {
        if (!tenantId) return;

        let query = supabase
            .from('invoices')
            .select(`
                *,
                clients (id, name),
                clinics (id, name, address, cif, city, postal_code, province, phone)
            `)
            .eq('cliente_id', tenantId);

        if (selectedClinicId !== 'all') {
            query = query.eq('clinic_id', selectedClinicId);
        }

        query = query.order('created_at', { ascending: false });

        if (activeTab === 'pending') {
            query = query.in('status', ['sent', 'partial']);
        } else if (activeTab === 'overdue') {
            query = query.eq('status', 'overdue');
        } else if (activeTab === 'paid') {
            query = query.eq('status', 'paid');
        }

        const { data } = await query.limit(50);

        // Fetch items for all invoices to support editing/printing
        if (data && data.length > 0) {
            const { data: allItems } = await supabase
                .from('invoice_items')
                .select('*')
                .in('invoice_id', data.map(i => i.id));

            const invoicesWithItems = data.map(inv => ({
                ...inv,
                clients: Array.isArray(inv.clients) ? inv.clients[0] : inv.clients,
                clinics: Array.isArray(inv.clinics) ? inv.clinics[0] : inv.clinics,
                invoice_items: allItems?.filter(it => it.invoice_id === inv.id) || []
            }));
            setInvoices(invoicesWithItems);
        } else {
            setInvoices([]);
        }
    }

    async function fetchPendingTreatments() {
        if (!tenantId) return;

        let query = supabase
            .from('patient_treatments')
            .select(`
                id, name, budget_amount, invoiced_amount, client_id, status, created_at,
                clients(name)
            `)
            .eq('cliente_id', tenantId)
            .in('status', ['accepted', 'in_progress', 'completed']);

        if (selectedClinicId !== 'all') {
            query = query.eq('clinic_id', selectedClinicId);
        }

        const { data } = await query
            .order('created_at', { ascending: false })
            .limit(20);

        // Filter to only show treatments with remaining amount to invoice
        // and normalize clients array from Supabase join
        const pending = (data || []).map(t => ({
            ...t,
            clients: Array.isArray(t.clients) ? t.clients[0] : t.clients
        })).filter(t =>
            (t.budget_amount || 0) > (t.invoiced_amount || 0)
        );
        setPendingTreatments(pending as PendingTreatment[]);
    }

    async function fetchStats() {
        if (!tenantId) return;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

        // This month
        let tmQuery = supabase
            .from('invoices')
            .select('total, paid_amount')
            .eq('cliente_id', tenantId);

        if (selectedClinicId !== 'all') {
            tmQuery = tmQuery.eq('clinic_id', selectedClinicId);
        }

        const { data: thisMonth } = await tmQuery
            .gte('issue_date', startOfMonth.split('T')[0])
            .neq('status', 'cancelled');

        // Last month
        let lmQuery = supabase
            .from('invoices')
            .select('total')
            .eq('cliente_id', tenantId);

        if (selectedClinicId !== 'all') {
            lmQuery = lmQuery.eq('clinic_id', selectedClinicId);
        }

        const { data: lastMonth } = await lmQuery
            .gte('issue_date', startOfLastMonth.split('T')[0])
            .lte('issue_date', endOfLastMonth.split('T')[0])
            .neq('status', 'cancelled');

        // Pending
        let pQuery = supabase
            .from('invoices')
            .select('total, paid_amount')
            .eq('cliente_id', tenantId);

        if (selectedClinicId !== 'all') {
            pQuery = pQuery.eq('clinic_id', selectedClinicId);
        }

        const { data: pending } = await pQuery
            .in('status', ['sent', 'partial', 'overdue']);

        // Overdue
        let oQuery = supabase
            .from('invoices')
            .select('total, paid_amount')
            .eq('cliente_id', tenantId);

        if (selectedClinicId !== 'all') {
            oQuery = oQuery.eq('clinic_id', selectedClinicId);
        }

        const { data: overdue } = await oQuery
            .eq('status', 'overdue');

        const invoicedThisMonth = thisMonth?.reduce((s, i) => s + Number(i.total), 0) || 0;
        const paidThisMonth = thisMonth?.reduce((s, i) => s + Number(i.paid_amount), 0) || 0;

        setStats({
            invoicedThisMonth,
            invoicedLastMonth: lastMonth?.reduce((s, i) => s + Number(i.total), 0) || 0,
            pendingCollection: pending?.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0) || 0,
            overdueAmount: overdue?.reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0) || 0,
            collectionRate: invoicedThisMonth > 0 ? (paidThisMonth / invoicedThisMonth) * 100 : 0
        });
    }

    async function fetchForecast() {
        if (!tenantId) return;

        // Calculate next month
        const now = new Date();
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const startOfNextMonth = nextMonthDate.toISOString().split('T')[0];
        const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

        let query = supabase
            .from('appointments')
            .select('id')
            .eq('cliente_id', tenantId)
            .gte('start_time', startOfNextMonth)
            .lte('start_time', endOfNextMonth)
            .in('status', ['scheduled', 'confirmed']);

        if (selectedClinicId !== 'all') {
            query = query.eq('clinic_id', selectedClinicId);
        }

        const { data: appts } = await query;

        // Estimate 80€ average per appointment
        const avgPerAppt = 80;

        setForecast({
            month: nextMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
            expectedIncome: (appts?.length || 0) * avgPerAppt,
            confidence: (appts?.length || 0) > 5 ? 'high' : 'medium'
        });
    }

    function handleExport() {
        if (invoices.length === 0) return;

        const headers = ['Factura', 'Cliente', 'Sede', 'Total', 'Pagado', 'Estado', 'Fecha'];
        const csvContent = [
            headers.join(','),
            ...invoices.map(inv => [
                inv.invoice_number,
                (inv.clients as any)?.name || 'N/A',
                (inv.clinics as any)?.name || 'N/A',
                inv.total,
                inv.paid_amount,
                inv.status,
                inv.issue_date
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `facturas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function handleQuickInvoice(treatmentId: string) {
        if (!tenantId) return;
        try {
            await createInvoiceFromTreatment(treatmentId, tenantId);
            alert('✅ Factura creada correctamente');
            fetchData(); // Refresh all data
        } catch (err: any) {
            alert('Error al facturar: ' + (err?.message || 'Error desconocido'));
        }
    }

    function getStatusBadge(status: string) {
        const styles: Record<string, string> = {
            draft: 'bg-gray-100 text-gray-700',
            sent: 'bg-blue-100 text-blue-700',
            partial: 'bg-amber-100 text-amber-700',
            paid: 'bg-emerald-100 text-emerald-700',
            overdue: 'bg-red-100 text-red-700',
            cancelled: 'bg-gray-100 text-gray-500'
        };
        const labels: Record<string, string> = {
            overdue: 'Vencida',
            cancelled: 'Cancelada'
        };
        const label = status === 'partial' ? 'Pago Fraccionado' : (labels[status] || status);
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {label}
            </span>
        );
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
    }

    async function handleCancelInvoice(invoiceId: string) {
        if (!confirm('¿Estás seguro de que deseas anular esta factura? Esta acción revertirá los importes facturados en el tratamiento vinculado.')) return;

        try {
            const { data, error } = await supabase.rpc('cancel_invoice_safe', {
                p_invoice_id: invoiceId
            });

            if (error) throw error;
            if (!data.success) throw new Error(data.error || 'Error al anular');

            alert('🚫 Factura anulada correctamente');
            fetchData();
        } catch (err: any) {
            alert('Error al anular: ' + err.message);
        }
    }

    function handlePrintInvoice(invoice: any) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const date = new Date(invoice.issue_date).toLocaleDateString('es-ES');
        const clinic = invoice.clinics as any || {};
        const client = invoice.clients as any || {};

        const itemsHtml = invoice.invoice_items?.map((item: any) => `
            <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold;">${item.description}</div>
                    ${item.treatment_type ? `<div style="font-size: 11px; color: #666;">${item.treatment_type}</div>` : ''}
                </td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unit_price)}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
            </tr>
        `).join('') || '';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Factura ${invoice.invoice_number}</title>
                    <style>
                        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { font-size: 28px; font-weight: bold; color: #10b981; margin-bottom: 5px; }
                        .clinic-info { font-size: 12px; color: #666; }
                        .invoice-meta { text-align: right; }
                        .section-title { font-size: 10px; text-transform: uppercase; font-weight: bold; color: #999; margin-bottom: 5px; letter-spacing: 1px; }
                        .client-info { margin-bottom: 40px; background: #f9fafb; padding: 20px; rounded: 8px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #10b981; color: white; padding: 12px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
                        .totals { margin-top: 30px; border-top: 2px solid #eee; padding-top: 20px; }
                        .total-row { display: flex; justify-content: flex-end; gap: 40px; font-size: 14px; margin-bottom: 5px; }
                        .grand-total { font-size: 20px; font-weight: bold; color: #10b981; margin-top: 10px; }
                        .footer { margin-top: 100px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">${clinic.name || 'Clínica Dental'}</div>
                            <div class="clinic-info">
                                ${clinic.address || ''}<br>
                                ${clinic.postal_code || ''} ${clinic.city || ''} ${clinic.province ? `(${clinic.province})` : ''}<br>
                                ${clinic.cif ? `CIF: ${clinic.cif}` : ''} ${clinic.phone ? `| Tel: ${clinic.phone}` : ''}
                            </div>
                        </div>
                        <div class="invoice-meta">
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">FACTURA</div>
                            <div style="font-size: 18px; color: #10b981; font-weight: bold;">${invoice.invoice_number}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 10px;">Fecha: ${date}</div>
                        </div>
                    </div>

                    <div class="client-info">
                        <div class="section-title">Datos del Paciente</div>
                        <div style="font-size: 16px; font-weight: bold;">${client.name || 'N/A'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Descripción del Servicio</th>
                                <th style="text-align: center;">Uds.</th>
                                <th style="text-align: right;">Precio/u</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="total-row">
                            <span>Total del Servicio</span>
                            <span style="min-width: 100px; text-align: right;">${formatCurrency(invoice.total)}</span>
                        </div>
                        <div class="total-row">
                            <span>IVA (0% Exento)</span>
                            <span style="min-width: 100px; text-align: right;">${formatCurrency(0)}</span>
                        </div>
                        ${invoice.is_fractional ? `
                            <div class="total-row" style="color: #059669; font-weight: bold;">
                                <span>Abonado (${invoice.payment_percent}%)</span>
                                <span style="min-width: 100px; text-align: right;">${formatCurrency(invoice.paid_amount || 0)}</span>
                            </div>
                            <div class="total-row" style="color: #666; font-size: 12px;">
                                <span>Pendiente</span>
                                <span style="min-width: 100px; text-align: right;">${formatCurrency(invoice.total - (invoice.paid_amount || 0))}</span>
                            </div>
                        ` : ''}
                        <div class="total-row grand-total">
                            <span>${invoice.is_fractional ? 'TOTAL PAGADO HOY' : 'TOTAL A PAGAR'}</span>
                            <span style="min-width: 100px; text-align: right;">${formatCurrency(invoice.is_fractional ? (invoice.paid_amount || 0) : invoice.total)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        Factura emitida según la normativa vigente. Los servicios médicos y sanitarios están exentos de IVA según el Art. 20.Uno.3º de la Ley 37/1992.
                    </div>

                    <script>
                        window.onload = function() { 
                            setTimeout(() => {
                                window.print(); 
                                // window.close(); // Commented out so user can see it if needed
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    const percentChange = stats && stats.invoicedLastMonth > 0
        ? ((stats.invoicedThisMonth - stats.invoicedLastMonth) / stats.invoicedLastMonth * 100).toFixed(1)
        : '0';

    return (
        <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-gray-50">
            {/* Header */}
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        Facturación
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión de facturas, pagos y análisis financiero</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-100 transition flex items-center gap-2"
                    >
                        <Download size={18} />
                        Exportar
                    </button>
                    <button
                        onClick={() => setShowInvoiceModal(true)}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-medium shadow-md shadow-emerald-200 hover:bg-emerald-700 transition flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Nueva Factura
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Facturado este mes */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Facturado este mes</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {formatCurrency(stats?.invoicedThisMonth || 0)}
                            </p>
                            <p className={`text-sm mt-2 flex items-center gap-1 ${Number(percentChange) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                <TrendingUp size={14} />
                                {Number(percentChange) >= 0 ? '+' : ''}{percentChange}% vs mes anterior
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-xl">
                            <Wallet className="text-emerald-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Pendiente de cobro */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Pendiente de cobro</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {formatCurrency(stats?.pendingCollection || 0)}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Tasa de cobro: {stats?.collectionRate.toFixed(0)}%
                            </p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <Clock className="text-amber-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Vencido */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Importe vencido</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {formatCurrency(stats?.overdueAmount || 0)}
                            </p>
                            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                Requiere atención
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-xl">
                            <AlertTriangle className="text-red-600" size={24} />
                        </div>
                    </div>
                </div>

                {/* Previsión */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-indigo-100 font-medium">Previsión {forecast?.month}</p>
                            <p className="text-3xl font-bold mt-2">
                                {formatCurrency(forecast?.expectedIncome || 0)}
                            </p>
                            <p className="text-sm text-indigo-200 mt-2 flex items-center gap-1">
                                <TrendingUp size={14} />
                                Confianza: {forecast?.confidence === 'high' ? 'Alta' : 'Media'}
                            </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Calendar className="text-white" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* PENDING TREATMENTS - Treatments ready to invoice */}
            {pendingTreatments.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Receipt className="text-amber-500" size={20} />
                            Tratamientos por Facturar
                            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                {pendingTreatments.length}
                            </span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingTreatments.slice(0, 6).map(t => {
                            const remaining = (t.budget_amount || 0) - (t.invoiced_amount || 0);
                            return (
                                <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{t.name}</p>
                                            <p className="text-sm text-gray-500">{t.clients?.name || 'Sin paciente'}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                                            t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {t.status === 'accepted' ? 'Aceptado' :
                                                t.status === 'in_progress' ? 'En curso' : 'Completado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-xs text-gray-400">Pendiente facturar</p>
                                            <p className="text-lg font-bold text-amber-600">€{remaining.toFixed(0)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleQuickInvoice(t.id)}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <Receipt size={14} />
                                            Facturar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabs + Filters */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    {/* Custom Dropdown for Clinics */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setSedeDropdownOpen(!sedeDropdownOpen)}
                            className="h-[40px] bg-white border border-emerald-500 rounded-full px-5 flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-sm min-w-[160px] justify-between group"
                        >
                            <span className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                                <Building size={16} className="text-emerald-500" />
                                {selectedClinicId === 'all' ? 'Todas las sedes' : clinics.find(c => c.id === selectedClinicId)?.name || 'Sede'}
                            </span>
                            <span className={`text-emerald-500 text-xs transition-transform ${sedeDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {/* Dropdown Menu */}
                        {sedeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 p-1">
                                <button
                                    onClick={() => { setSelectedClinicId('all'); setSedeDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${selectedClinicId === 'all'
                                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                                        : 'text-[#3c4043] hover:bg-gray-50'
                                        }`}
                                >
                                    <span>Todas las sedes</span>
                                    {selectedClinicId === 'all' && <Check size={16} className="text-emerald-600" />}
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2" />
                                {clinics.map(clinic => (
                                    <button
                                        key={clinic.id}
                                        onClick={() => {
                                            setSelectedClinicId(clinic.id);
                                            setSedeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${selectedClinicId === clinic.id
                                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                                            : 'text-[#3c4043] hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="truncate">{clinic.name}</span>
                                        {selectedClinicId === clinic.id && <Check size={16} className="text-emerald-600" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'Todas' },
                            { id: 'pending', label: 'Pendientes' },
                            { id: 'overdue', label: 'Vencidas' },
                            { id: 'paid', label: 'Pagadas' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id as any); }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                                    ? 'bg-white shadow text-gray-900'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        Cargando facturas...
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p>No hay facturas</p>
                        <p className="text-sm mt-1">Las facturas se generarán automáticamente al completar citas</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sede</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagado</th>
                                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50 transition">
                                    <td className="py-4 px-6">
                                        <span className="font-mono text-sm font-medium text-gray-900">
                                            {invoice.invoice_number}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-gray-700">
                                        {(invoice.clients as any)?.name || 'N/A'}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                                            <Building size={14} />
                                            {(invoice.clinics as any)?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right font-medium text-gray-900">
                                        {formatCurrency(Number(invoice.total))}
                                    </td>
                                    <td className="py-4 px-6 text-right text-emerald-600 font-medium">
                                        {formatCurrency(Number(invoice.paid_amount))}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                    <td className="py-4 px-6 text-center text-sm text-gray-500">
                                        {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handlePrintInvoice(invoice)}
                                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                                title="Imprimir"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingInvoice(invoice);
                                                    setShowInvoiceModal(true);
                                                }}
                                                className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                                                title="Rectificar"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleCancelInvoice(invoice.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                                title="Anular / Cancelar"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                            <button
                                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                                                title="Más opciones"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* New Invoice Modal */}
            {
                tenantId && (
                    <NewInvoiceModal
                        isOpen={showInvoiceModal}
                        onClose={() => {
                            setShowInvoiceModal(false);
                            setEditingInvoice(null);
                        }}
                        tenantId={tenantId}
                        onSuccess={fetchData}
                        initialInvoice={editingInvoice}
                    />
                )
            }
        </div>
    );
}
