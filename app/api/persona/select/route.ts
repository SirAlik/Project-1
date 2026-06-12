/**
 * Persona Selection Route Handler
 * ================================
 * Sets the active_persona cookie on the RESPONSE object.
 * This ensures the browser receives Set-Cookie header before any navigation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { signPersonaToken } from '@/lib/auth/context-service';

// ============================================================
// CONFIGURATION
// ============================================================

// Removed local signPersonaToken as it is now in @/lib/context-service

// ============================================================
// DASHBOARD PATH RESOLVER
// ============================================================

import { ROLE_DASHBOARD_MAP, UserRole } from '@/lib/auth/roles';

// ...

function getDashboardPath(role: string, schoolId?: string): string | null {
    // 1. Special Dynamic Handling (school-scoped roles بلا مسار ثابت)
    if (role === 'school_admin' && schoolId) {
        return `/school/${schoolId}/dashboard`;
    }
    if (role === 'school_affairs_vp' && schoolId) {
        return `/school/${schoolId}/school-affairs`;
    }

    // 2. Static Mapping from Registry
    const staticPath = ROLE_DASHBOARD_MAP[role as UserRole];
    if (staticPath) {
        return staticPath;
    }

    // 3. No mapping found
    if (process.env.NODE_ENV === 'development') {
        console.warn(`[getDashboardPath] ⚠️ No mapping for role: "${role}".`);
    }
    return null;
}

// ============================================================
// POST HANDLER
// ============================================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const rawRedirectTo: unknown = body.redirectTo;
        // قبول redirectTo من العميل فقط إذا كان مساراً داخلياً يبدأ بـ / وخالٍ من ://
        const redirectTo: string | undefined =
            typeof rawRedirectTo === 'string' &&
            rawRedirectTo.startsWith('/') &&
            !rawRedirectTo.includes('://')
                ? rawRedirectTo
                : undefined;
        const { role } = body;

        const requestedRole = role;


        // Extract rawSchoolId for debugging and normalization
        const rawSchoolId = body.schoolId;


        // Normalize schoolId: treat undefined/null/"null"/"undefined"/"" as missing
        // Belt + suspenders: explicit typeof check to catch any edge cases
        const normalizedSchoolId: string | undefined =
            typeof rawSchoolId === 'string' &&
                rawSchoolId &&
                rawSchoolId !== 'null' &&
                rawSchoolId !== 'undefined' &&
                rawSchoolId !== ''
                ? rawSchoolId
                : undefined;

        if (!requestedRole || typeof requestedRole !== 'string') {
            return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
        }

        // GLOBAL_ROLES: Can activate without schoolId
        // - system_owner: Verified from profiles.system_role (NOT user_personas)
        // Note: system_owner is the canonical role.
        const GLOBAL_ROLES = new Set(['system_owner']);
        const isGlobalRole = GLOBAL_ROLES.has(requestedRole);

        // SCOPE ENFORCEMENT: School-scoped roles REQUIRE schoolId
        if (!isGlobalRole && !normalizedSchoolId) {
            return NextResponse.json({
                success: false,
                error: 'SCHOOL_CONTEXT_REQUIRED',
                message: 'هذا الدور يتطلب تحديد المدرسة أولاً'
            }, { status: 400 });
        }

        // Create Supabase client to verify user
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll() {
                        // STABILITY: This is a read-only verification context.
                        // We do NOT want to mutate cookies here (e.g. token refresh)
                        // as it can cause conflicts with the active_persona cookie we are about to set.
                        // Just log if it tries to set anything.
                        // console.log('[API/persona/select] Ignoring cookie mutation:', cookiesToSet.map(c => c.name));
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.log('[API/persona/select] Auth failed:', authError?.message);
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // DUAL IDENTITY LAYER VERIFICATION:
        // - Global roles (system_owner): Check profiles.system_role
        // - School-scoped roles: Check user_personas

        let effectiveSchoolId: string | undefined = normalizedSchoolId;

        if (isGlobalRole) {
            // Verify from profiles.system_role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('system_role')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError || !profile || profile.system_role !== 'system_owner') {
                console.log('[API/persona/select] User is not system_owner');
                return NextResponse.json({ success: false, error: 'Not authorized as system owner' }, { status: 403 });
            }
            // Global roles have no schoolId
            effectiveSchoolId = undefined;
        } else {
            // Verify from user_personas (school-scoped)
            const { data: persona, error: personaError } = await supabase
                .from('user_personas')
                .select('role, school_id')
                .eq('user_id', user.id)
                .eq('role', requestedRole)
                .eq('school_id', normalizedSchoolId!)
                .maybeSingle();

            if (personaError || !persona) {
                console.log('[API/persona/select] School persona not found for user');
                return NextResponse.json({ success: false, error: 'Persona not found' }, { status: 403 });
            }
            effectiveSchoolId = persona.school_id;
        }

        // Sign the JWT token
        const token = await signPersonaToken({
            userId: user.id,
            role: requestedRole,
            schoolId: effectiveSchoolId,
            timestamp: Date.now(),
        });

        // Determine redirect path
        const redirectPath = redirectTo || getDashboardPath(requestedRole, effectiveSchoolId);

        // GUARD: Prevent success responses that would redirect back to /portal
        if (redirectPath === '/portal' || !redirectPath) {
            // STRICT MODE: If it's a school-scoped role and we have a school ID, 
            // but still resolved to /portal, then we MISSING a specific dashboard mapping.
            if (!isGlobalRole && effectiveSchoolId) {
                console.warn('[API/persona/select] Role mapping missing for:', requestedRole);
                return NextResponse.json({
                    success: false,
                    error: 'MISSING_DASHBOARD_MAPPING',
                    message: 'No dashboard found for this role.'
                }, { status: 400 });
            }

            console.warn('[API/persona/select] Invalid redirect path - missing school context?', { requestedRole, effectiveSchoolId });
            return NextResponse.json(
                { success: false, error: 'NO_VALID_DASHBOARD_PATH', message: 'This role requires a school context.' },
                { status: 400 }
            );
        }

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            redirectPath,
        });

        // Set the cookie on the RESPONSE object
        response.cookies.set('active_persona', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        return response;
    } catch (error) {
        console.error('[API/persona/select] Error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
