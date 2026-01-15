import React, { useMemo } from 'react';
import { PatientTreatment } from '@/types';
import { User, Calendar, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TreatmentDetailsViewProps {
    treatment: PatientTreatment;
    payments: any[];
}

export const TreatmentDetailsView: React.FC<TreatmentDetailsViewProps> = ({ treatment, payments }) => {

    // Payment Plan Calculation (Memoized)
    const paymentPlan = useMemo(() => {
        const remaining = treatment.budget_amount - treatment.paid_amount;
        const startDate = treatment.budget_accepted_at
            ? new Date(treatment.budget_accepted_at)
            : treatment.start_date
                ? new Date(treatment.start_date)
                : new Date();

        const proposedPayments = [];
        if (remaining > 0) {
            const numPayments = remaining > 1000 ? 3 : remaining > 500 ? 2 : 1;
            const paymentAmount = remaining / numPayments;
            for (let i = 0; i < numPayments; i++) {
                const paymentDate = new Date(startDate);
                paymentDate.setMonth(paymentDate.getMonth() + i + 1);
                proposedPayments.push({
                    id: `proposed-${i}`,
                    amount: paymentAmount,
                    date: paymentDate,
                    isPaid: false
                });
            }
        }

        return [
            ...payments.map(p => ({
                id: p.id,
                amount: Number(p.amount),
                date: new Date(p.payment_date),
                isPaid: true,
                method: p.payment_method
            })),
            ...proposedPayments
        ].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [treatment, payments]);

    return (
        <div className="space-y-6">
            {/* Status & Info */}
            <div className="flex items-center gap-3">
                <StatusBadge status={treatment.status} />
                {treatment.doctor?.name && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <User size={14} />
                        {treatment.doctor.name}
                    </span>
                )}
                {treatment.tooth_numbers && (
                    <span className="text-sm text-gray-500">
                        Pieza(s): {treatment.tooth_numbers}
                    </span>
                )}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">€{treatment.budget_amount.toFixed(0)}</p>
                    <p className="text-xs text-gray-500 uppercase">Presupuesto</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">€{treatment.invoiced_amount.toFixed(0)}</p>
                    <p className="text-xs text-gray-500 uppercase">Facturado</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">€{treatment.paid_amount.toFixed(0)}</p>
                    <p className="text-xs text-gray-500 uppercase">Cobrado</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Progreso de cobro</span>
                    <span>{Math.round((treatment.paid_amount / treatment.budget_amount) * 100)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                        style={{ width: `${(treatment.paid_amount / treatment.budget_amount) * 100}%` }}
                    />
                </div>
            </div>

            {treatment.notes && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <p className="text-sm text-gray-700">{treatment.notes}</p>
                </div>
            )}

            {/* Payment Schedule */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar size={18} /> Plan de Pagos
                </h3>
                <div className="relative space-y-3">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {paymentPlan.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 pl-10">Sin plan de pagos</div>
                    ) : (
                        paymentPlan.map((payment: any) => (
                            <div key={payment.id} className="relative flex gap-4 pl-10">
                                <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white shadow ${payment.isPaid ? 'bg-emerald-500' : payment.date < new Date() ? 'bg-red-400' : 'bg-gray-300'
                                    }`} />
                                <div className={`flex-1 rounded-xl p-4 ${payment.isPaid ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-200 border-dashed'
                                    }`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-semibold ${payment.isPaid ? 'text-emerald-700' : 'text-gray-600'}`}>
                                                €{payment.amount.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">{payment.isPaid ? (payment.method || 'Efectivo') : 'Pendiente'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">{payment.date.toLocaleDateString()}</p>
                                            {payment.isPaid ? <CheckCircle size={16} className="text-emerald-500 ml-auto mt-1" /> : <Clock size={16} className="text-gray-400 ml-auto mt-1" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

function StatusBadge({ status }: { status: PatientTreatment['status'] }) {
    const config: any = {
        quoted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Presupuestado', icon: Clock },
        accepted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Aceptado', icon: CheckCircle },
        in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Curso', icon: Clock },
        completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado', icon: CheckCircle },
        cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado', icon: AlertCircle },
    };
    const c = config[status] || config.quoted;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text}`}>
            <Icon size={14} />
            {c.label}
        </span>
    );
}
