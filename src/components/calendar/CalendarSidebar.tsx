import React from 'react';
import { Plus, Check } from 'lucide-react';

interface MiniCalendarProps {
    currentDate: Date;
    onSelectDate: (d: Date, openModal?: boolean) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, onSelectDate }) => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDay = new Date(year, month, 1).getDay();
    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Create empty slots for days before the 1st of the month
    const blanks = Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} className="w-6 h-6"></div>);

    // Create day cells
    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const isCurrentSelected = day === currentDate.getDate();

        return (
            <div
                key={day}
                onClick={() => {
                    const d = new Date(year, month, day);
                    onSelectDate(d, true);
                }}
                className={`w-6 h-6 flex items-center justify-center rounded-full cursor-pointer text-xs
                    ${isToday ? 'bg-emerald-600 text-white font-bold' : ''}
                    ${!isToday && isCurrentSelected ? 'ring-1 ring-emerald-600' : ''}
                    hover:bg-emerald-50
                `}
            >
                {day}
            </div>
        );
    });

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-100 mb-4">
            <div className="text-center font-bold text-gray-700 mb-2">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => <span key={d} className="text-gray-400 font-medium">{d}</span>)}
                {blanks}
                {days}
            </div>
        </div>
    );
};

interface CalendarSidebarProps {
    onCreateClick: () => void;
    currentDate: Date;
    onSelectDate: (d: Date, openModal?: boolean) => void;
    doctors: { id: string, name: string, specialty: string | null, color: string }[];
    selectedDoctors: string[];
    onToggleDoctor: (id: string) => void;
    onSelectAllDoctors: () => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
    onCreateClick,
    currentDate,
    onSelectDate,
    doctors,
    selectedDoctors,
    onToggleDoctor,
    onSelectAllDoctors
}) => {
    return (
        <aside className="w-[256px] min-w-[256px] flex flex-col pt-3 pl-2 pr-4 h-full overflow-y-auto hidden md:flex">
            <button
                onClick={onCreateClick}
                className="w-[140px] h-[48px] bg-white rounded-full shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] flex items-center gap-3 pl-3 hover:shadow-[0_4px_4px_0_rgba(60,64,67,0.3)] hover:bg-[#f5f8fc] transition-all mb-6 ml-1 group"
            >
                <Plus className="text-4xl font-thin text-emerald-600" size={32} />
                <span className="font-medium text-[#3c4043] text-sm group-hover:text-emerald-600">Crear</span>
            </button>

            <MiniCalendar
                currentDate={currentDate}
                onSelectDate={onSelectDate}
            />

            {/* Doctors Filter Removed as per user request */}
        </aside>
    );
};
