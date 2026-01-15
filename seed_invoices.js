/**
 * Seed sample invoices for demo
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = 'dddd4444-4444-4444-4444-444444444444'; // Sevilla Dental

async function seedInvoices() {
    console.log('💰 Seeding Sample Invoices...\n');

    // Get clients for this tenant
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('cliente_id', TENANT_ID)
        .limit(5);

    if (!clients || clients.length === 0) {
        console.log('No clients found. Run seed_fixed.js first.');
        return;
    }

    // Get clinics
    const { data: clinics } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('cliente_id', TENANT_ID)
        .limit(4);

    const treatments = [
        { name: 'Limpieza Dental', price: 45, type: 'limpieza' },
        { name: 'Blanqueamiento LED', price: 350, type: 'estetica' },
        { name: 'Carilla Composite', price: 280, type: 'estetica' },
        { name: 'Implante Dental', price: 1500, type: 'implante' },
        { name: 'Ortodoncia Invisible', price: 3500, type: 'ortodoncia' }
    ];

    const statuses = ['paid', 'paid', 'paid', 'sent', 'partial', 'overdue'];

    let invoiceNum = 1;

    for (let i = 0; i < 8; i++) {
        const client = clients[i % clients.length];
        const clinic = clinics ? clinics[i % clinics.length] : null;
        const treatment = treatments[i % treatments.length];
        const status = statuses[i % statuses.length];

        const invoiceNumber = `FAC-2024-${invoiceNum.toString().padStart(5, '0')}`;
        const total = treatment.price;
        const paidAmount = status === 'paid' ? total : (status === 'partial' ? total * 0.5 : 0);

        const issueDate = new Date();
        issueDate.setDate(issueDate.getDate() - (30 - i * 3));

        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);

        const { data: invoice, error } = await supabase.from('invoices').insert({
            invoice_number: invoiceNumber,
            cliente_id: TENANT_ID,
            client_id: client.id,
            clinic_id: clinic?.id || null,
            subtotal: total,
            tax_rate: 0,
            tax_amount: 0,
            total: total,
            status: status,
            issue_date: issueDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            paid_amount: paidAmount,
            sent_at: status !== 'draft' ? issueDate.toISOString() : null,
            paid_at: status === 'paid' ? new Date().toISOString() : null
        }).select().single();

        if (error) {
            console.log(`❌ ${invoiceNumber}: ${error.message}`);
        } else {
            console.log(`✅ ${invoiceNumber} - ${client.name} - ${treatment.name} - ${status}`);

            // Add invoice item
            await supabase.from('invoice_items').insert({
                invoice_id: invoice.id,
                description: treatment.name,
                treatment_type: treatment.type,
                quantity: 1,
                unit_price: treatment.price,
                total: treatment.price,
                sort_order: 0
            });

            // Add payment if paid/partial
            if (paidAmount > 0) {
                await supabase.from('payments').insert({
                    invoice_id: invoice.id,
                    cliente_id: TENANT_ID,
                    amount: paidAmount,
                    method: ['card', 'cash', 'bizum', 'transfer'][i % 4]
                });
            }

            invoiceNum++;
        }
    }

    console.log('\n✅ Done! Check /billing page.');
}

seedInvoices().catch(console.error);
