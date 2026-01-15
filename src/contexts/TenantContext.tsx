"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface TenantUser {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenantId: string;
    tenantName: string;
}

interface TenantContextType {
    user: TenantUser | null;
    tenantId: string | null;
    loading: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    signOut: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
    user: null,
    tenantId: null,
    loading: true,
    isAdmin: false,
    isSuperAdmin: false,
    signOut: async () => { }
});

export function useTenant() {
    return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<TenantUser | null>(null);
    const userRef = useRef<TenantUser | null>(null);
    const [loading, setLoading] = useState(true);
    const setLoadingState = (state: boolean, reason: string) => {
        // Keep logs for important state changes
        if (state) console.log(`[TenantContext] Auth loading started (${reason})`);
        setLoading(state);
    };
    const router = useRouter();
    const pathname = usePathname();

    // Keep userRef in sync with user state
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // 1. Initial check
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[TenantContext] initAuth session:', session?.user?.email);
                if (mounted && session?.user) {
                    console.log('[TenantContext] initAuth: user found, fetching profile');
                    await fetchUserProfile(session.user);
                } else if (mounted) {
                    console.log('[TenantContext] initAuth: no session user');
                    setLoadingState(false, 'initAuth - No session user');
                }
            } catch (err) {
                console.error('[Auth] Init Error:', err);
                if (mounted) setLoadingState(false, 'initAuth - Error');
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[TenantContext] onAuthStateChange: ${event}`, session?.user?.email);
            if (!mounted) return;

            if (event === 'SIGNED_IN' && session?.user) {
                // IMPORTANT: Only reload if the user identity changed to prevent infinite remount loops
                // Use userRef.current to avoid stale closures
                if (!userRef.current || userRef.current.email !== session.user.email) {
                    setLoadingState(true, 'onAuthStateChange - SIGNED_IN');
                    await fetchUserProfile(session.user);
                } else {
                    console.log('[TenantContext] SIGNED_IN event for current user, skipping fetch');
                    setLoadingState(false, 'onAuthStateChange - SIGNED_IN (current user)');
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoadingState(false, 'onAuthStateChange - SIGNED_OUT');
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                if (!userRef.current) {
                    await fetchUserProfile(session.user);
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchInProgress = useRef(false);
    const mountedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchUserProfile = async (authUser: SupabaseUser) => {
        if (fetchInProgress.current) {
            console.log('[TenantContext] fetchUserProfile already in progress, skipping duplicate call for:', authUser.email);
            return;
        }

        fetchInProgress.current = true;
        setLoadingState(true, 'fetchUserProfile');

        // Add a safety timeout to prevent infinite loading if Supabase hangs
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
        );

        try {
            console.log('[TenantContext] Querying users table for:', authUser.id);

            // Wrap the fetch in a promise that can be timed out
            const fetchPromise = (async () => {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id, email, name, role, tenant_id')
                    .eq('auth_user_id', authUser.id)
                    .single();

                if (userError || !userData) {
                    console.error('[TenantContext] fetchUserProfile User Error:', userError || 'User not found in users table');
                    return null;
                }

                const { data: tenantData, error: tenantError } = await supabase
                    .from('tenants')
                    .select('id, nombre')
                    .eq('id', userData.tenant_id)
                    .single();

                if (tenantError) {
                    console.error('[TenantContext] fetchUserProfile Tenant Error:', tenantError);
                }

                return {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    tenantId: userData.tenant_id,
                    tenantName: tenantData?.nombre || 'Unknown'
                };
            })();

            const result = await Promise.race([fetchPromise, timeoutPromise]) as TenantUser | null;

            if (mountedRef.current && result) {
                setUser(result);
                console.log('[TenantContext] fetchUserProfile SUCCESS for:', authUser.email);
            } else if (mountedRef.current) {
                setUser(null);
                console.log('[TenantContext] fetchUserProfile completed but no user found for:', authUser.email);
            }
        } catch (error) {
            console.error('[TenantContext] fetchUserProfile ERROR:', error);
            if (mountedRef.current) setUser(null);
        } finally {
            if (mountedRef.current) {
                console.log('[TenantContext] fetchUserProfile FINISHED. Setting loading=false');
                setLoadingState(false, 'fetchUserProfile finish');
                fetchInProgress.current = false;
            }
        }
    };

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.push('/login');
    }, [router]);

    const contextValue = useMemo(() => ({
        user,
        tenantId: user?.tenantId || null,
        loading,
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
        isSuperAdmin: user?.role === 'super_admin' || user?.email === 'macarenita.ia@gmail.com',
        signOut
    }), [user, loading, signOut]);

    return (
        <TenantContext.Provider value={contextValue}>
            {children}
        </TenantContext.Provider>
    );
}
