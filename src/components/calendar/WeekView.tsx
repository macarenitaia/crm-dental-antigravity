import React, { useRef, useEffect } from 'react';
import { ExtendedAppointment } from '@/hooks/useCalendar';
import { HOURS, START_HOUR, DAYS_SHORT, getStartOfWeek, isSameDay, getStatusColor } from './constants';

interface WeekViewProps {
    currentDate: Date;
    appointments: ExtendedAppointment[];
    onDateClick: (date: Date) => void;
    onEventClick: (app: ExtendedAppointment) => void;
    onSlotClick: (date: Date) => void;
    onEventDrop: (e: React.DragEvent, date: Date) => void;
    onDragStart: (e: React.DragEvent, appId: string) => void;
    doctors: { id: string, color: string }[];
}

export const WeekView: React.FC<WeekViewProps> = ({
    currentDate,
    appointments,
    onDateClick,
    onEventClick,
    onSlotClick,
    onEventDrop,
    onDragStart,
    doctors
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, []);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto w-full relative custom-scrollbar bg-white scroll-smooth"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* Sticky Day Header */}
                <div className="sticky top-0 z-30 bg-white flex ml-16 min-w-0 shadow-[0_1px_0_#dadce0]">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const d = getStartOfWeek(currentDate);
                        d.setDate(d.getDate() + i);
                        const isToday = isSameDay(new Date(), d);
                        return (
                            <div
                                key={i}
                                onClick={() => onDateClick(d)}
                                className="flex-1 py-3 text-center min-w-0 bg-white cursor-pointer hover:bg-gray-50 border-l border-transparent first:border-l-0"
                            >
                                <span className={`text-[11px] font-medium uppercase mb-1 block ${isToday ? 'text-emerald-700' : 'text-[#70757a]'}`}>
                                    {DAYS_SHORT[i]}
                                </span>
                                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[24px] mx-auto transition-colors ${isToday ? 'bg-emerald-600 text-white' : 'text-[#3c4043] group-hover:bg-emerald-50'}`}>
                                    {d.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex relative" style={{ height: HOURS.length * 60 }}>
                    {/* Time Axis */}
                    <div className="w-16 flex-shrink-0 flex flex-col text-right pr-2 pt-0 border-r border-[#dadce0] absolute left-0 top-0 bottom-0 bg-white z-30 h-full">
                        {HOURS.map(h => (
                            <div key={h} className="h-[60px] relative">
                                <span className="text-xs text-[#70757a] relative -top-2 block pr-2">{h === START_HOUR ? `${h}:00` : `${h}:00`}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-1 flex relative ml-16 min-w-0">
                        {/* Row Lines */}
                        {HOURS.map((h, i) => (
                            <div key={h} className="absolute w-full border-b border-[#dadce0] h-[60px]" style={{ top: i * 60 }} />
                        ))}

                        {/* Day Columns */}
                        {Array.from({ length: 7 }).map((_, i) => {
                            const d = getStartOfWeek(currentDate);
                            d.setDate(d.getDate() + i);

                            // Filter appointments for this day to avoid iteration overhead later? 
                            // Actually it's better to keep logic simple here.
                            const dayApps = appointments.filter(app => isSameDay(new Date(app.start_time), d));

                            return (
                                <div key={i} className="flex-1 border-l border-[#dadce0] first:border-l-0 relative h-full min-w-0">
                                    {/* Drop Zones */}
                                    {HOURS.map((h, rowIdx) => (
                                        <div
                                            key={h}
                                            className="absolute w-full h-[60px] z-0"
                                            style={{ top: rowIdx * 60 }}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => {
                                                const newD = new Date(d);
                                                newD.setHours(h, 0, 0, 0);
                                                onEventDrop(e, newD);
                                            }}
                                            onClick={() => {
                                                const newD = new Date(d);
                                                newD.setHours(h, 0, 0, 0);
                                                onSlotClick(newD);
                                            }}
                                        />
                                    ))}

                                    {dayApps.map(app => {
                                        const start = new Date(app.start_time);
                                        const h = start.getHours();
                                        if (h < START_HOUR) return null;

                                        const end = new Date(app.end_time || app.start_time);
                                        const durationMs = end.getTime() - start.getTime();
                                        const durationMin = Math.max(20, Math.floor(durationMs / 60000)); // Minimum 20px

                                        const top = (h - START_HOUR) * 60 + start.getMinutes();
                                        const doctor = doctors.find(doc => doc.id === app.doctor_id);

                                        return (
                                            <div
                                                key={app.id}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, app.id)}
                                                onClick={(e) => { e.stopPropagation(); onEventClick(app); }}
                                                className={`absolute left-1 right-1 rounded pt-1 pb-1 pl-2 pr-2 text-xs cursor-grab active:cursor-grabbing hover:shadow-md border shadow-sm z-20 overflow-hidden text-white ${getStatusColor(app.status)}`}
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${durationMin}px`,
                                                    borderLeftWidth: '4px',
                                                    borderLeftColor: doctor?.color || '#999'
                                                }}
                                            >
                                                <span className="font-semibold block truncate">
                                                    {app.clients?.name || 'Cita'}
                                                </span>
                                                <span className="block truncate opacity-90">
                                                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
