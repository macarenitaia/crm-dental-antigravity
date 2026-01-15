"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MessageSquare, Calendar, Users, Bot, LayoutDashboard, Building2, Power, FileText, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';

// Colors for each nav item hover effect
const NAV_COLORS: Record<string, { hover: string; active: string; shadow: string }> = {
    '/': { hover: 'hover:bg-blue-50 hover:text-blue-600', active: 'bg-blue-50 text-blue-600', shadow: 'shadow-blue-100' },
    '/chat': { hover: 'hover:bg-green-50 hover:text-green-600', active: 'bg-green-50 text-green-600', shadow: 'shadow-green-100' },
    '/calendar': { hover: 'hover:bg-purple-50 hover:text-purple-600', active: 'bg-purple-50 text-purple-600', shadow: 'shadow-purple-100' },
    '/clients': { hover: 'hover:bg-orange-50 hover:text-orange-600', active: 'bg-orange-50 text-orange-600', shadow: 'shadow-orange-100' },
    '/billing': { hover: 'hover:bg-emerald-50 hover:text-emerald-600', active: 'bg-emerald-50 text-emerald-600', shadow: 'shadow-emerald-100' },
    '/settings': { hover: 'hover:bg-indigo-50 hover:text-indigo-600', active: 'bg-indigo-50 text-indigo-600', shadow: 'shadow-indigo-100' },
    '/super-admin': { hover: 'hover:bg-rose-50 hover:text-rose-600', active: 'bg-rose-50 text-rose-600', shadow: 'shadow-rose-100' },
};

const Sidebar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isSuperAdmin } = useTenant();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="h-screen w-20 flex flex-col items-center bg-white border-r border-gray-200 py-6">
            <Link href="/" className="mb-8 group">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
                    <Bot size={28} />
                </div>
            </Link>

            <nav className="flex-1 flex flex-col gap-4 w-full px-2">
                <NavItem href="/chat" icon={<MessageSquare size={22} />} label="Chats" active={pathname === '/chat'} />
                <NavItem href="/calendar" icon={<Calendar size={22} />} label="Calendario" active={pathname === '/calendar'} />
                <NavItem href="/clients" icon={<Users size={22} />} label="Pacientes" active={pathname === '/clients'} />
                <NavItem href="/billing" icon={<FileText size={22} />} label="Facturación" active={pathname === '/billing'} />
                <NavItem href="/settings" icon={<Building2 size={22} />} label="Sedes" active={pathname === '/settings'} />
                {isSuperAdmin && (
                    <NavItem href="/super-admin" icon={<ShieldCheck size={22} />} label="SuperAdmin" active={pathname === '/super-admin'} />
                )}
            </nav>

            <div className="mt-auto flex flex-col gap-6 w-full px-2">
                <button
                    onClick={handleLogout}
                    className="group relative flex flex-col items-center justify-center p-3 text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-600 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-red-200"
                >
                    <Power size={22} strokeWidth={2.5} />
                    <span className="text-[10px] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-16 bg-gray-800 text-white px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
                        Cerrar Sesión
                    </span>
                </button>
            </div>
        </div>
    );
};

const NavItem = ({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) => {
    const colors = NAV_COLORS[href] || NAV_COLORS['/'];

    return (
        <Link
            href={href}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 group relative
                ${active
                    ? `${colors.active} shadow-sm ${colors.shadow}`
                    : `text-gray-400 ${colors.hover}`
                }
            `}
        >
            <div className="relative">
                {icon}
                {label === 'Chats' && !active && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                )}
            </div>
            <span className="text-[10px] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-16 bg-gray-800 text-white px-2 py-1 rounded shadow-md z-50 whitespace-nowrap">
                {label}
            </span>
        </Link>
    );
};

export default Sidebar;

