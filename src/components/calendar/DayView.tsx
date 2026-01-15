import React, { useRef, useEffect } from 'react';
import { ExtendedAppointment } from '@/hooks/useCalendar';
import { HOURS, START_HOUR, isSameDay, getStatusColor } from './constants';

interface DayViewProps {
    currentDate: Date;
    appointments: ExtendedAppointment[];
    onEventClick: (app: ExtendedAppointment) => void;
    onSlotClick: (date: Date) => void;
    onEventDrop: (e: React.DragEvent, date: Date) => void;
    onDragStart: (e: React.DragEvent, appId: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
    currentDate,
    appointments,
    onEventClick,
    onSlotClick,
    onEventDrop,
    onDragStart
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <div className="flex-1 overflow-y-auto w-full relative custom-scrollbar bg-white">
            <div
                ref={scrollRef}
                className="flex relative"
                style={{ height: HOURS.length * 60 }}
            >
                {/* Time Axis */}
                <div className="w-16 flex-shrink-0 flex flex-col text-right pr-2 pt-0 border-r border-[#dadce0] absolute left-0 top-0 bottom-0 bg-white z-30 h-full">
                    {HOURS.map(h => (
                        <div key={h} className="h-[60px] relative">
                            <span className="text-xs text-[#70757a] relative -top-2 block pr-2">{h === START_HOUR ? `${h}:00` : `${h}:00`}</span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative ml-16">
                    {HOURS.map((h, i) => (
                        <div
                            key={h}
                            className="h-[60px] border-b border-[#dadce0] w-full absolute z-0"
                            style={{ top: i * 60 }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => {
                                const newD = new Date(currentDate);
                                newD.setHours(h, 0, 0, 0);
                                onEventDrop(e, newD);
                            }}
                            onClick={() => {
                                const newD = new Date(currentDate);
                                newD.setHours(h, 0, 0, 0);
                                onSlotClick(newD);
                            }}
                        />
                    ))}

                    {appointments
                        .filter(app => isSameDay(new Date(app.start_time), currentDate))
                        .map(app => {
                            const start = new Date(app.start_time);
                            const h = start.getHours();
                            if (h < START_HOUR) return null;

                            const top = (h - START_HOUR) * 60 + start.getMinutes();
                            const end = new Date(app.end_time || app.start_time);
                            const durationMs = end.getTime() - start.getTime();
                            const durationMin = Math.max(20, Math.floor(durationMs / 60000)); // Minimum 20px

                            return (
                                <div key={app.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, app.id)}
                                    onClick={(e) => { e.stopPropagation(); onEventClick(app); }}
                                    className={`absolute left-4 right-4 text-white p-2 rounded border border-white shadow hover:scale-[1.01] transition-all cursor-grab active:cursor-grabbing z-10 flex flex-col justify-center ${getStatusColor(app.status)}`}
                                    style={{ top, height: durationMin }}>
                                    <div className="font-semibold text-sm">{app.clients?.name}</div>
                                    <div className="text-xs opacity-90">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )
                        })}
                </div>
            </div>
        </div>
    );
};
