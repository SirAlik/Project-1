'use server';

/**
 * Switch Persona Action
 * ======================
 * Allows users to switch between their assigned personas/roles.
 * Updates the active_persona JWT cookie and returns the redirect path.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { signPersonaToken, PersonaContext } from '@/lib/auth/context-service';
import {
    switchPersonaSchema,
    type SwitchPersonaInput,
    type SwitchPersonaResult,
} from '@/lib/contracts/switch-persona-contract';

// ============================================================
// DEV-ONLY: Redact schoolId for logging
// ============================================================
function redactSchoolId(schoolId: unknown): string {
    if (schoolId === null) return 'null';
    if (schoolId === undefined) return 'undefined';
    if (typeof schoolId !== 'string') return `[${typeof schoolId}]`;
    if (schoolId.length <= 8) return '****';
    return `${schoolId.slice(0, 4)}...${schoolId.slice(-4)}`;
}

/**
 * Determines the dashboard path for a given role.
 * (Type-safe: role comes from validated contract)
 */
import { ROLE_DASHBOARD_MAP, UserRole, SCHOOL_ROLES } from '@/lib/auth/roles';

// ...

function getDashboardPath(role: SwitchPersonaInput['role'], schoolId?: string): string {
    // 1. Dynamic handling (school-scoped roles بلا مسار ثابت)
    if (role === 'school_admin' && schoolId) {
        return `/school/${schoolId}/dashboard`;
    }
    if (role === 'school_affairs_vp' && schoolId) {
        return `/school/${schoolId}/school-affairs`;
    }

    // 2. Static mapping
    const path = ROLE_DASHBOARD_MAP[role as UserRole];
    if (path) return path;

    return '/portal';
}

/**
 * Server action to switch the active persona.
 */
export async function switchPersonaAction(
    input: SwitchPersonaInput
): Promise<SwitchPersonaResult> {
    const correlationId = input?.correlationId || 'no-id';

    try {

        const parsed = switchPersonaSchema.safeParse(input);
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;

            if (process.env.NODE_ENV === 'development') {
                console.error(`[ServerAction][${correlationId}] validation failed`, fieldErrors);
            }

            return {
                success: false,
                error: 'Invalid input',
                validationErrors: fieldErrors,
                correlationId,
            };
        }

        const { role, schoolId } = parsed.data;

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'Not authenticated', correlationId };
        }

        const userId = user.id;

        let personaQuery = supabase
            .from('user_personas')
            .select('role, school_id')
            .eq('user_id', userId)
            .eq('role', role);

        if (schoolId) {
            personaQuery = personaQuery.eq('school_id', schoolId);
        } else {
            personaQuery = personaQuery.is('school_id', null);
        }

        const { data: userPersona } = await personaQuery.maybeSingle();
        if (!userPersona) {
            return {
                success: false,
                error: 'You do not have access to this role',
                correlationId,
            };
        }

        const schoolScopedRoles = SCHOOL_ROLES;

        if (schoolScopedRoles.has(role as UserRole)) {
            const effectiveSchoolId = schoolId || userPersona.school_id;
            if (!effectiveSchoolId) {
                console.error(`[switchPersona][${correlationId}] REJECTED: school-scoped role without schoolId`, {
                    role,
                    inputSchoolId: redactSchoolId(schoolId),
                    dbSchoolId: redactSchoolId(userPersona.school_id),
                });
                return {
                    success: false,
                    error: 'لا يمكن تفعيل هذا الدور بدون مدرسة محددة. تأكد من ربط حسابك بمدرسة.',
                    correlationId,
                };
            }
        }

        const personaContext: PersonaContext = {
            userId,
            role: role as UserRole,
            schoolId: schoolId || userPersona.school_id,
            timestamp: Date.now(),
        };

        const token = await signPersonaToken({ ...personaContext, timestamp: personaContext.timestamp! });

        cookieStore.set('active_persona', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });

        const redirectPath = getDashboardPath(role, personaContext.schoolId);

        revalidatePath('/', 'layout');

        if (process.env.NODE_ENV === 'development') {
            console.log(`[AUDIT][${correlationId}] switched`, {
                role,
                schoolId: redactSchoolId(personaContext.schoolId),
                redirectPath,
            });
        }

        return { success: true, redirectPath, correlationId };
    } catch (err) {
        console.error(`[ServerAction][${correlationId}] Exception:`, err);
        return { success: false, error: 'Failed to switch persona', correlationId };
    }
}