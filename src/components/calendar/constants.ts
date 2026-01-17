import { Appointment } from '@/types';

export const START_HOUR = 7;
export const END_HOUR = 21;
export const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);
export const DAYS_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
};

export const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

export const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
        case 'confirmed': return 'bg-emerald-500 border-emerald-600';
        case 'cancelled': return 'bg-red-500 border-red-600';
        case 'rescheduled': return 'bg-orange-500 border-orange-600';
        case 'completed': return 'bg-gray-500 border-gray-600';
        default: return 'bg-emerald-500 border-emerald-600';
    }
};
