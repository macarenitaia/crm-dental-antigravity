import React from 'react';
import { ExtendedAppointment } from '@/hooks/useCalendar';
import { DAYS_SHORT, isSameDay, getStatusColor } from './constants';

interface MonthViewProps {
    currentDate: Date;
    appointments: ExtendedAppointment[];
    onEventClick: (app: ExtendedAppointment) => void;
    onSlotClick: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    appointments,
    onEventClick,
    onSlotClick,
}) => {
    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 border-b border-[#dadce0] bg-white">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-[#70757a] uppercase border-r border-transparent">
                        {d}
                    </div>
                ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5 h-full">
                {Array.from({ length: 35 }).map((_, i) => {
                    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                    const startOffset = firstDayOfMonth.getDay();
                    const d = new Date(firstDayOfMonth);
                    d.setDate(d.getDate() - startOffset + i);

                    const dayApps = appointments.filter(app => isSameDay(new Date(app.start_time), d));
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                    return (
                        <div
                            key={i}
                            className={`border-b border-r border-[#dadce0] p-1 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-[#f8f9fa]'} min-h-0 relative group hover:bg-gray-50 transition-colors cursor-pointer`}
                            onClick={() => {
                                const newD = new Date(d);
                                newD.setHours(9, 0, 0, 0);
                                onSlotClick(newD);
                            }}
                        >
                            <div className="flex justify-center mb-1">
                                <span className={`text-xs font-medium w-6 h-6 rounded-full flex items-center justify-center ${isSameDay(d, new Date()) ? 'bg-emerald-600 text-white' : isCurrentMonth ? 'text-[#3c4043]' : 'text-[#70757a]'}`}>
                                    {d.getDate() === 1 ? d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : d.getDate()}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {dayApps.map(app => (
                                    <div key={app.id} onClick={(e) => { e.stopPropagation(); onEventClick(app); }}
                                        className={`text-white text-[10px] rounded px-1.5 py-0.5 truncate cursor-pointer shadow-sm ${getStatusColor(app.status)}`}>
                                        {new Date(app.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {app.clients?.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
