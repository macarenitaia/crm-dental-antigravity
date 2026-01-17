"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bot, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Load remembered email on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        console.log('[Login] Attempting login for:', email);

        try {
            console.log('[Login] Calling signInWithPassword...');
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            console.log('[Login] Auth response:', { data: data?.user?.email, error: authError?.message });

            if (authError) {
                console.error('[Login] Auth error:', authError);
                setError(authError.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                console.log('[Login] User authenticated, checking users table...');
                // Check if user exists in our users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, tenant_id')
                    .eq('auth_user_id', data.user.id)
                    .single();

                console.log('[Login] User data:', { userData, userError: userError?.message });

                if (userError || !userData) {
                    console.error('[Login] User not in users table');
                    setError('Tu cuenta no está asociada a ninguna clínica. Contacta al administrador.');
                    await supabase.auth.signOut();
                    setLoading(false);
                    return;
                }

                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('remembered_email', email);
                } else {
                    localStorage.removeItem('remembered_email');
                }

                console.log('[Login] Success! Redirecting to dashboard...');
                // Success - redirect to dashboard
                router.push('/');
            }
        } catch (err: any) {
            console.error('[Login] Catch error:', err);
            setError(err.message || 'Error al iniciar sesión');
            setLoading(false);
        }
    };

    return (
        <div className="h-full w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
                        <Bot size={36} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">CRM Dental</h1>
                    <p className="text-gray-500 mt-1">Gestión Inteligente de Clínicas</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Iniciar Sesión</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@clinica.com"
                                    required
                                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-gray-400 hover:text-emerald-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer select-none">
                                Recuérdame
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        ¿Problemas para acceder? Contacta a soporte.
                    </p>
                </div>

                {/* Demo credentials */}
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs text-emerald-700 text-center mb-2">
                        <strong>Cuentas de prueba:</strong>
                    </p>
                    <div className="text-xs text-emerald-600 space-y-1">
                        <p>• demo@clinica.com / demo1234</p>
                        <p>• admin@clinicagarcia.com / Garcia2024</p>
                        <p>• admin@sonrisaperfecta.com / Sonrisa2024</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

