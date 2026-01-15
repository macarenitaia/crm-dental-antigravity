import React from 'react';
import { ExtendedAppointment } from '@/hooks/useCalendar';
import { MONTHS_FULL, isSameDay } from './constants';

interface YearViewProps {
    currentDate: Date;
    appointments: ExtendedAppointment[];
    onDateClick: (date: Date) => void;
}

export const YearView: React.FC<YearViewProps> = ({
    currentDate,
    appointments,
    onDateClick,
}) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-10 max-w-7xl mx-auto">
                {MONTHS_FULL.map((m, mIdx) => {
                    const year = currentDate.getFullYear();
                    const firstDay = new Date(year, mIdx, 1);
                    const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
                    const startOffset = firstDay.getDay();

                    return (
                        <div key={m} className="flex flex-col select-none">
                            <h3 className="font-semibold text-[#3c4043] pl-2 mb-4 text-sm">{m}</h3>
                            <div className="grid grid-cols-7 text-center mb-2">
                                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                                    <span key={d} className="text-[10px] text-[#70757a] font-medium">{d}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-2 gap-x-0">
                                {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}

                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const d = new Date(year, mIdx, i + 1);
                                    const dayApps = appointments.filter(app => isSameDay(new Date(app.start_time), d));
                                    const hasEvent = dayApps.length > 0;
                                    const isToday = isSameDay(d, new Date());

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => onDateClick(d)}
                                            className="h-8 flex items-center justify-center relative cursor-pointer hover:bg-gray-50 rounded-full"
                                        >
                                            <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-600 text-white font-bold' : 'text-[#3c4043]'}`}>
                                                {i + 1}
                                            </span>
                                            {hasEvent && !isToday && (
                                                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500"></div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
