"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    useRef,
    useCallback,
} from "react";
import { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { Role } from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/db/supabase-browser";

/**
 * Persona type for role switching
 */
export interface Persona {
    role: Role;
    schoolId?: string;
    schoolName?: string;
    jobTitle?: string;
    isPrimary?: boolean;
}

type AuthContextType = {
    supabase: SupabaseClient;
    user: User | null;
    session: Session | null;
    role: Role | null;
    schoolId: string | null;
    schoolName: string | null;
    fullName: string | null;
    isLoading: boolean;
    authError: string | null;

    /** Persona handling */
    allPersonas: Persona[];
    setPersona: (persona: Persona) => void;

    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    supabase: {} as SupabaseClient,
    user: null,
    session: null,
    role: null,
    schoolId: null,
    schoolName: null,
    fullName: null,
    isLoading: true,
    authError: null,
    allPersonas: [],
    setPersona: () => { },
    signOut: async () => { },
});

const PERSONA_STORAGE_KEY = "schoolos:last_persona";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = useMemo(() => {
        if (typeof window === "undefined") {
            return null as unknown as SupabaseClient;
        }
        return getSupabaseBrowserClient();
    }, []);

    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [schoolId, setSchoolId] = useState<string | null>(null);
    const [schoolName, setSchoolName] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [allPersonas, setAllPersonas] = useState<Persona[]>([]);

    const lastProcessedUserIdRef = useRef<string | null>(null);
    const profileFetchPromiseRef = useRef<Promise<void> | null>(null);
    const isMountedRef = useRef(false);

    const devLog = (msg: string, ...args: unknown[]) => {
        if (process.env.NODE_ENV === "development") {
            console.debug(`[AUTH-TRACE] ${msg}`, ...args);
        }
    };

    /** Explicit persona setter (single source of truth) */
    const setPersona = (persona: Persona) => {
        setRole(persona.role);
        setSchoolId(persona.schoolId ?? null);
        setSchoolName(persona.schoolName ?? null);

        try {
            localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(persona));
        } catch { }
    };

    const restorePersistedPersona = (personas: Persona[]) => {
        try {
            const raw = localStorage.getItem(PERSONA_STORAGE_KEY);
            if (!raw) return false;

            const saved: Persona = JSON.parse(raw);
            const match = personas.find(
                (p) =>
                    p.role === saved.role &&
                    p.schoolId === saved.schoolId
            );

            if (match) {
                setPersona(match);
                return true;
            }
        } catch { }
        return false;
    };

    const fetchAllPersonas = async (userId: string) => {
        if (!supabase) return;

        try {
            // DUAL IDENTITY LAYER:
            // 1. Global ownership from profiles.system_role
            // 2. School personas from user_personas

            // Fetch profile for system_role (global owner check)
            const { data: profile } = await supabase
                .from("profiles")
                .select("system_role, full_name")
                .eq("id", userId)
                .maybeSingle();

            if (isMountedRef.current && profile?.full_name) {
                setFullName(profile.full_name);
            }

            // Fetch school-scoped personas
            const { data: schoolPersonas, error } = await supabase
                .from("user_personas")
                .select(`
                    role,
                    school_id,
                    job_title,
                    is_primary,
                    schools ( name )
                `)
                .eq("user_id", userId);

            if (error) throw error;

            const personas: Persona[] = [];

            if (profile?.system_role === 'system_owner') {
                personas.push({
                    role: 'system_owner' as Role,
                    schoolId: undefined,
                    schoolName: undefined,
                    jobTitle: 'مالك النظام',
                    isPrimary: true,  // System owner is always primary
                });
            }

            type PersonaRow = {
                role: string;
                school_id: string;
                job_title: string | null;
                is_primary: boolean | null;
                schools: { name: string } | null;
            };
            ((schoolPersonas || []) as unknown as PersonaRow[]).forEach((p) => {
                personas.push({
                    role: p.role as Role,
                    schoolId: p.school_id,
                    schoolName: p.schools?.name ?? undefined,
                    jobTitle: p.job_title ?? undefined,
                    isPrimary: !!p.is_primary && !profile?.system_role,
                });
            });

            if (!isMountedRef.current) return;

            setAllPersonas(personas);

            if (personas.length === 0) return;

            const restored = restorePersistedPersona(personas);
            if (restored) return;

            const primary = personas.find((p) => p.isPrimary) ?? personas[0];
            if (!role) setPersona(primary);
        } catch (err: unknown) {
            console.error("fetchAllPersonas error:", err);
            setAuthError("Failed to load user roles");
        }
    };

    const refreshUserData = async (userId: string) => {
        if (!isMountedRef.current) return;

        if (profileFetchPromiseRef.current) {
            return profileFetchPromiseRef.current;
        }

        profileFetchPromiseRef.current = (async () => {
            try {
                await fetchAllPersonas(userId);
            } catch (err) {
                console.error(err);
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                    profileFetchPromiseRef.current = null;
                }
            }
        })();

        return profileFetchPromiseRef.current;
    };

    // Stable ref so the auth subscription always calls the latest refreshUserData
    const refreshUserDataRef = useRef(refreshUserData);
    refreshUserDataRef.current = refreshUserData;

    useEffect(() => {
        if (!supabase) return;

        isMountedRef.current = true;

        const initSession = async () => {
            devLog("initSession: START");
            try {
                const { data, error } = await supabase.auth.getSession();
                devLog("initSession: getSession returned", { hasSession: !!data.session, error: error?.message });
                if (error) throw error;

                const currentSession = data.session;
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    const uid = currentSession.user.id;
                    if (lastProcessedUserIdRef.current !== uid) {
                        lastProcessedUserIdRef.current = uid;
                        await refreshUserDataRef.current(uid);
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    devLog("initSession: No session, setting isLoading=false");
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                console.error(err);
                setAuthError("Authentication initialization failed");
                devLog("initSession: ERROR, setting isLoading=false");
                setIsLoading(false);
            }
        };

        void initSession();

        const { data: { subscription } } =
            supabase.auth.onAuthStateChange(async (event, newSession) => {
                if (!isMountedRef.current) return;
                devLog("onAuthStateChange:", event, { userId: newSession?.user?.id });

                setSession(newSession);
                setUser(newSession?.user ?? null);

                const newUserId = newSession?.user?.id;
                if (newUserId) {
                    if (lastProcessedUserIdRef.current !== newUserId) {
                        lastProcessedUserIdRef.current = newUserId;
                        await refreshUserDataRef.current(newUserId);
                    }
                } else {
                    lastProcessedUserIdRef.current = null;
                    profileFetchPromiseRef.current = null;
                    setRole(null);
                    setSchoolId(null);
                    setSchoolName(null);
                    setFullName(null);
                    setAllPersonas([]);
                    setIsLoading(false);
                }
            });

        return () => {
            isMountedRef.current = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    const signOut = useCallback(async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
    }, [supabase]);

    const value = useMemo(
        () => ({
            supabase,
            user,
            session,
            role,
            schoolId,
            schoolName,
            fullName,
            isLoading,
            authError,
            allPersonas,
            setPersona,
            signOut,
        }),
        [
            supabase,
            user,
            session,
            role,
            schoolId,
            schoolName,
            fullName,
            isLoading,
            authError,
            allPersonas,
            signOut,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}