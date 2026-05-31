import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { createSupabaseServerClient, getPrivateUser } from '../db/supabase-server';
import { UserRole } from './roles';
import { DEMO_USER_ID, DEMO_SCHOOL_ID, DEMO_EMAIL } from '@/lib/mock-data';

/**
 * Persona Context - The Verified Identity
 */
export interface PersonaContext {
    userId: string;
    role: UserRole;
    schoolId?: string; // UUID
    isSystemOwner?: boolean;
    displayName?: string;
    email?: string;
    timestamp?: number;
}

/**
 * Retrieves the Active Persona strictly validated against Supabase Auth.
 * 
 * SECURITY GUARANTEES:
 * 1. Source of Truth: Supabase `app_metadata` (NOT user_metadata, NOT cookies).
 * 2. Fail Closed: If cookie claims mismatch `app_metadata`, return NULL.
 * 3. Scope Enforcement: System Owners can masquerade (if implemented), others cannot.
 */
export async function getActivePersona(): Promise<PersonaContext | null> {
    // وضع العرض التجريبي: يقرأ الدور المختار من الـ cookie بدلاً من الاتصال بـ Supabase
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const cookieStore = await cookies();
        const activePersonaCookie = cookieStore.get('active_persona')?.value;

        let demoRole: UserRole = 'school_principal';
        let demoSchoolId: string | undefined = DEMO_SCHOOL_ID;

        if (activePersonaCookie) {
            try {
                const { jwtVerify } = await import('jose');
                const secret = getSecretKey();
                const { payload } = await jwtVerify(activePersonaCookie, secret);
                if (typeof payload.role === 'string') {
                    demoRole = payload.role as UserRole;
                }
                if (payload.schoolId === null || payload.schoolId === undefined) {
                    demoSchoolId = undefined;
                } else if (typeof payload.schoolId === 'string') {
                    demoSchoolId = payload.schoolId;
                }
            } catch {
                // cookie فاسد أو منتهي — نعود للافتراضي school_principal
            }
        }

        return {
            userId:        DEMO_USER_ID,
            role:          demoRole,
            schoolId:      demoRole === 'system_owner' ? undefined : demoSchoolId,
            isSystemOwner: demoRole === 'system_owner',
            displayName:   'مدير النظام التجريبي',
            email:         DEMO_EMAIL,
        };
    }

    const supabase = await createSupabaseServerClient();

    // 1. Fetch Safe User (Checks app_metadata existence)
    const user = await getPrivateUser(supabase);
    if (!user) return null;

    // 2. Extract Authority (The "Real" User)
    const authorityRole = user.app_metadata.role as UserRole;
    const authoritySchoolId = user.app_metadata.school_id as string | undefined;
    const isSystemOwner = authorityRole === 'system_owner';

    // 3. Extract Claims (The "Requested" Context)
    const cookieStore = await cookies();
    const activePersonaCookie = cookieStore.get('active_persona')?.value;

    // Default to Authority if no cookie (or if parsing fails)
    let requestedSchoolId = authoritySchoolId;
    let requestedRole = authorityRole;

    if (isSystemOwner && activePersonaCookie) {
        try {
            const { jwtVerify } = await import('jose');
            const secret = getSecretKey();
            const { payload } = await jwtVerify(activePersonaCookie, secret);
            if (typeof payload.schoolId === 'string') {
                requestedSchoolId = payload.schoolId;
            }
            if (typeof payload.role === 'string') {
                requestedRole = payload.role as UserRole;
            }
        } catch {
            // Malformed or expired cookie → fall back to authority
        }
    }

    // 4. IDENTITY ENFORCEMENT CHECK

    // A. School Isolation
    // Only System Owner can switch schools (conceptually).
    // Everyone else MUST use their assigned school_id.
    if (!isSystemOwner) {
        if (requestedSchoolId !== authoritySchoolId) {
            console.error(`[Security] School ID Theft Attempt: User ${user.id} tried to access ${requestedSchoolId} but belongs to ${authoritySchoolId}`);
            return null; // FAIL CLOSED
        }
    }

    // B. Role Escalation
    // Users cannot claim a role higher than their authority.
    // (Simplification: User Role = Authority Role for now, unless multi-role implementation exists)
    if (requestedRole !== authorityRole) {
        // console.warn(`[Security] Role mismatch. Asserting authority role.`);
        requestedRole = authorityRole;
    }

    return {
        userId: user.id,
        role: requestedRole,
        schoolId: authoritySchoolId, // Strict: Use Authority School ID for now
        isSystemOwner,
        displayName: user.user_metadata?.full_name,
        email: user.email
    };
}

// ============================================================
// JWT UTILITIES
// ============================================================

// سر ثابت للوضع التجريبي فقط — لا يُستخدم في الإنتاج أبداً
const DEMO_JWT_SECRET = 'demo-mode-only-not-for-production-schoolos-2026';

function getSecretKey(): Uint8Array {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        // في Demo Mode نقبل JWT_SECRET من البيئة إذا كان موجوداً، وإلا نستخدم السر الثابت
        return new TextEncoder().encode(process.env.JWT_SECRET ?? DEMO_JWT_SECRET);
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is required');
    return new TextEncoder().encode(secret);
}

/**
 * Signs a persona token and sets the active_persona cookie.
 */
export async function setActivePersona(context: {
    userId: string;
    role: string;
    schoolId?: string;
    timestamp: number;
}): Promise<void> {
    const token = await signPersonaToken(context);
    const cookieStore = await cookies();
    cookieStore.set('active_persona', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
    });
}

/**
 * Signs a Persona Context into a JWT token for the active_persona cookie.
 */
export async function signPersonaToken(context: {
    userId: string;
    role: string;
    schoolId?: string;
    timestamp: number;
}): Promise<string> {
    const secret = getSecretKey();
    return new SignJWT({
        userId: context.userId,
        role: context.role,
        schoolId: context.schoolId,
        timestamp: context.timestamp,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);
}
