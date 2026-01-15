"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    icon,
    className = "",
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 py-2.5 bg-white border ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-50' : 'border-gray-200'} rounded-xl transition-all flex items-center justify-between text-left ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-50 hover:border-gray-300'}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {icon && <span className="text-gray-500">{icon}</span>}
                    <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 p-1">
                    {options.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No hay opciones
                        </div>
                    ) : (
                        options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-sm text-left rounded-lg flex items-center justify-between group transition-colors ${option.value === value
                                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && (
                                    <Check size={14} className="text-emerald-600" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
