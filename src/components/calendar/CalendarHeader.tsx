import React from 'react';
import { Menu, ChevronLeft, ChevronRight, Search, Check } from 'lucide-react';
import { CalendarViewType } from '@/hooks/useCalendar';

interface CalendarHeaderProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (v: boolean) => void;
    currentDate: Date;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    view: CalendarViewType;
    setView: (v: CalendarViewType) => void;
    clinics: { id: string, name: string }[];
    selectedClinicId: string | null;
    setSelectedClinicId: (id: string) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    isSidebarOpen,
    setIsSidebarOpen,
    currentDate,
    onNavigate,
    searchQuery,
    setSearchQuery,
    view,
    setView,
    clinics,
    selectedClinicId,
    setSelectedClinicId
}) => {
    const [viewDropdownOpen, setViewDropdownOpen] = React.useState(false);
    const [sedeDropdownOpen, setSedeDropdownOpen] = React.useState(false);

    return (
        <header className="h-[64px] min-h-[64px] border-b border-[#dadce0] flex items-center px-4 bg-white z-40 transition-all w-full relative">
            <div className="flex items-center gap-2 min-w-[240px]">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 rounded-full hover:bg-gray-100 text-[#5f6368]">
                    <Menu size={20} />
                </button>
                <span className="text-[22px] text-[#5f6368] font-normal pl-1">Calendario</span>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => onNavigate('today')}
                    className="px-6 py-2 border border-[#dadce0] rounded-full text-sm font-medium hover:bg-gray-50 bg-white transition-colors"
                >
                    Hoy
                </button>
                <div className="flex items-center gap-1 text-[#5f6368]">
                    <button onClick={() => onNavigate('prev')} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft size={20} /></button>
                    <button onClick={() => onNavigate('next')} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight size={20} /></button>
                </div>
                <h2 className="text-[22px] text-[#3c4043] font-normal ml-3 capitalize min-w-[200px] mb-1">
                    {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
            </div>

            {/* Search - Removed as per user request */}
            <div className="flex-1" />

            <div className="flex items-center gap-3 ml-auto relative">
                {/* Sede Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => { setSedeDropdownOpen(!sedeDropdownOpen); setViewDropdownOpen(false); }}
                        className="h-[36px] bg-white border border-emerald-500 rounded-full px-4 flex items-center gap-2 hover:bg-emerald-50 transition-colors shadow-sm min-w-[140px] justify-between"
                    >
                        <span className="text-sm font-medium text-emerald-700">
                            📍 {clinics.find(c => c.id === selectedClinicId)?.name || 'Sede'}
                        </span>
                        <span className="text-emerald-600 text-xs">▼</span>
                    </button>

                    {sedeDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-[180px] bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-100">
                            {clinics.map(clinic => (
                                <button
                                    key={clinic.id}
                                    onClick={() => {
                                        setSelectedClinicId(clinic.id);
                                        setSedeDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 ${selectedClinicId === clinic.id ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-[#3c4043]'
                                        }`}
                                >
                                    {selectedClinicId === clinic.id && <Check size={14} />}
                                    {clinic.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* View Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => { setViewDropdownOpen(!viewDropdownOpen); setSedeDropdownOpen(false); }}
                        className="h-[36px] bg-white border border-[#dadce0] rounded-full px-4 flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm min-w-[100px] justify-between"
                    >
                        <span className="text-sm font-medium text-[#3c4043] capitalize">
                            {view === 'week' ? 'Semana' : view === 'month' ? 'Mes' : view === 'day' ? 'Día' : 'Año'}
                        </span>
                        <span className="text-[#5f6368] text-xs">▼</span>
                    </button>

                    {viewDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-[140px] bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in zoom-in-95 duration-100">
                            {(['day', 'week', 'month', 'year'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => { setView(v); setViewDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 text-sm ${view === v ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-[#3c4043]'}`}
                                >
                                    {v === 'day' ? 'Día' : v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Año'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
