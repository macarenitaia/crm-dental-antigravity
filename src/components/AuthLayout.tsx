"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';

function AppContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useTenant();
    const [mounted, setMounted] = useState(false);
    const [showLoadingTooLong, setShowLoadingTooLong] = useState(false);
    const isLoginPage = pathname === '/login';

    // Handle hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if loading persists too long
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading && mounted && !isLoginPage) {
            timer = setTimeout(() => {
                setShowLoadingTooLong(true);
            }, 8000); // 8 seconds
        } else {
            setShowLoadingTooLong(false);
        }
        return () => clearTimeout(timer);
    }, [loading, mounted, isLoginPage]);

    useEffect(() => {
        if (!mounted) return;

        // Only redirect if NOT loading
        if (!loading) {
            // Redirect UNauthenticated users to login
            if (!user && !isLoginPage) {
                console.log('[AuthLayout] Unauthenticated, redirecting to /login');
                router.push('/login');
            }

            // Redirect AUTHENTICATED users away from login
            if (user && isLoginPage) {
                console.log('[AuthLayout] Authenticated, redirecting to /');
                router.push('/');
            }
        }
    }, [loading, isLoginPage, user, router, mounted]);

    // Don't render anything relevant until mounted to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    // Show loading spinner while checking auth (but not on login page)
    if (loading && !isLoginPage) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-[#f0f2f5]">
                <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <div className="space-y-2">
                        <p className="text-gray-700 font-bold">Iniciando sesión segura...</p>
                        <p className="text-gray-500 text-xs">Preparando tu panel de control</p>
                    </div>

                    {showLoadingTooLong && (
                        <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                            <p className="text-amber-800 text-xs mb-3">La conexión está tardando más de lo habitual.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-amber-700 transition-colors"
                            >
                                Reintentar Conexión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Login page - no sidebar
    if (isLoginPage) {
        return <>{children}</>;
    }

    // Regular pages - with sidebar
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
            <div className="z-[100] relative h-full shrink-0">
                <Sidebar />
            </div>
            <main className="flex-1 h-full overflow-hidden relative z-0 min-w-0">
                {children}
            </main>
        </div>
    );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <TenantProvider>
            <AppContent>{children}</AppContent>
        </TenantProvider>
    );
}
