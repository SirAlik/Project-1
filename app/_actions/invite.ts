/**
 * Invite Actions
 * ==============
 * Server actions for managing user invitations.
 * Uses Safe Action pattern for validation, RBAC, and audit logging.
 * 
 * SECURITY:
 * - Token hashing for secure storage
 * - School-scoped access control
 * - Expiry handling
 */

'use server';

import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { createSafeAction } from '@/lib/safe-action';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { UserRole, SCHOOL_ROLES } from '@/lib/auth/roles';

// ============================================================
// CONSTANTS
// ============================================================

/** Roles that can generate invites - school leaders + coordinators */
const INVITE_ROLES: UserRole[] = [
    'system_owner',
    'school_admin',
    'school_principal',
];

/** Invite expiry duration in hours */
const INVITE_EXPIRY_HOURS = 48;

// ============================================================
// HELPERS
// ============================================================

/**
 * Hash a token using SHA-256 for secure storage.
 */
function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/**
 * Normalize mobile number to international format.
 */
function normalizeMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '');
    if (digits.startsWith('966')) return '+' + digits;
    if (digits.startsWith('05')) return '+966' + digits.substring(1);
    if (digits.startsWith('5') && digits.length === 9) return '+966' + digits;
    return '+' + digits;
}

/**
 * Escape/sanitize input (placeholder for future sanitization logic).
 */
function escapeInput<T>(input: T): T {
    return input;
}

/**
 * Validate legacy invite (for transition period).
 */
function validateLegacy(invite: {
    expires_at: string;
    used_at: string | null;
    full_name: string;
    mobile_number: string;
    target_role: string;
}): { valid: boolean; reason?: string; invite?: typeof invite } {
    if (invite.used_at) {
        return { valid: false, reason: 'already_used' };
    }
    if (new Date(invite.expires_at) < new Date()) {
        return { valid: false, reason: 'expired' };
    }
    return { valid: true, invite };
}

// ============================================================
// SCHEMAS
// ============================================================

const generateInviteSchema = z.object({
    full_name: z.string().min(2, 'الاسم مطلوب'),
    mobile_number: z.string().min(9, 'رقم الجوال مطلوب'),
    email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
    role: z.string().refine(
        (val) => SCHOOL_ROLES.has(val as UserRole),
        { message: 'الدور المحدد غير صالح' }
    ),
    school_id: z.string().uuid('معرف المدرسة غير صالح'),
});

// ============================================================
// TYPES
// ============================================================

export type GenerateInviteInput = z.infer<typeof generateInviteSchema>;
export type ConsumeInviteInput = {
    token: string;
    password: string;
};

export interface InviteResult {
    success: boolean;
    link?: string;
    token?: string;
    error?: string;
}

export interface ValidateInviteResult {
    valid: boolean;
    reason?: string;
    invite?: {
        full_name: string;
        mobile_number: string;
        target_role: string;
        school_name?: string;
        expires_at: string;
    };
}

export interface JoinSchoolResult {
    success: boolean;
    email?: string;
    error?: string;
}

// ============================================================
// SAFE ACTIONS
// ============================================================

/**
 * Generates a new invite link.
 * School-scoped: requires school context and enforces cross-school prevention.
 */
export const generateInvite = createSafeAction({
    schema: generateInviteSchema,
    allowedRoles: INVITE_ROLES,
    requiresSchoolContext: true,

    audit: {
        action: 'generate',
        resource: 'invite',
        maskFields: ['mobile_number', 'email'],
    },

    async handler(input: GenerateInviteInput, ctx): Promise<InviteResult> {
        const { full_name, mobile_number, email, role, school_id } = input;

        // 1. Normalize mobile number
        const normalizedMobile = normalizeMobile(mobile_number);

        // 2. Generate secure token
        const rawToken = randomBytes(24).toString('hex');
        const hashedToken = hashToken(rawToken);

        // 3. Calculate expiry
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        // 4. Check for existing active invite (prevent duplicates)
        const { data: existingInvite } = await supabaseAdmin
            .from('invites')
            .select('id')
            .eq('mobile_number', normalizedMobile)
            .eq('target_school_id', school_id)
            .is('used_at', null)
            .maybeSingle();

        if (existingInvite) {
            // Update existing invite instead of creating duplicate
            const { error: updateError } = await supabaseAdmin
                .from('invites')
                .update({
                    token: rawToken,
                    token_hash: hashedToken,
                    full_name,
                    email: email || null,
                    target_role: role,
                    expires_at: expiresAt,
                    created_by: ctx.user.userId,
                })
                .eq('id', existingInvite.id);

            if (updateError) {
                console.error('[generateInvite] Update error:', updateError);
                return { success: false, error: 'فشل في تحديث الدعوة' };
            }
        } else {
            // Create new invite
            const { error: insertError } = await supabaseAdmin.from('invites').insert({
                token: rawToken,
                token_hash: hashedToken,
                mobile_number: normalizedMobile,
                email: email || null,
                full_name,
                target_role: role,
                target_school_id: school_id,
                expires_at: expiresAt,
                created_by: ctx.user.userId,
            });

            if (insertError) {
                console.error('[generateInvite] Insert error:', insertError);
                return { success: false, error: 'فشل في إنشاء الدعوة' };
            }
        }

        // 5. Generate invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const inviteLink = `${baseUrl}/join?token=${rawToken}`;

        return {
            success: true,
            link: inviteLink,
            token: rawToken,
        };
    },
});

// ============================================================
// PUBLIC ACTIONS (No RBAC - for unauthenticated users)
// ============================================================

/**
 * Validates an invite token.
 * Public action - used on join page before user is authenticated.
 */
export async function validateInvite(rawToken: string): Promise<ValidateInviteResult> {
    if (!rawToken || rawToken.length < 10) {
        return { valid: false, reason: 'invalid_token' };
    }

    const hashed = hashToken(rawToken);

    // Primary lookup by hash
    const { data: invite, error } = await supabaseAdmin
        .from('invites')
        .select(`
            full_name,
            mobile_number,
            target_role,
            expires_at,
            used_at,
            schools(name)
        `)
        .eq('token_hash', hashed)
        .maybeSingle();

    if (error) {
        console.error('[validateInvite] Query error:', error);
        return { valid: false, reason: 'server_error' };
    }

    if (!invite) {
        // Fallback: legacy lookup by raw token (for pre-hash invites)
        const { data: legacyInvite } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('token', rawToken)
            .maybeSingle();

        if (legacyInvite) {
            const result = validateLegacy(legacyInvite);
            if (result.valid && result.invite) {
                return {
                    valid: true,
                    invite: {
                        full_name: result.invite.full_name,
                        mobile_number: result.invite.mobile_number,
                        target_role: result.invite.target_role,
                        expires_at: result.invite.expires_at,
                    },
                };
            }
            return { valid: false, reason: result.reason };
        }

        return { valid: false, reason: 'invalid_token' };
    }

    // Check if already used
    if (invite.used_at) {
        return { valid: false, reason: 'already_used' };
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
        return { valid: false, reason: 'expired' };
    }

    // Extract school name safely
    const schoolName = Array.isArray(invite.schools)
        ? invite.schools[0]?.name
        : (invite.schools as { name?: string } | null)?.name;

    return {
        valid: true,
        invite: {
            full_name: invite.full_name,
            mobile_number: invite.mobile_number,
            target_role: invite.target_role,
            school_name: schoolName,
            expires_at: invite.expires_at,
        },
    };
}

/**
 * Consumes an invite and creates user account.
 * Public action - used on join page.
 */
export async function joinSchool(input: ConsumeInviteInput): Promise<JoinSchoolResult> {
    const { token, password } = escapeInput(input);

    if (!token || token.length < 10) {
        return { success: false, error: 'رمز الدعوة غير صالح' };
    }

    const hashed = hashToken(token);

    // 1. Find and validate invite
    const { data: invite } = await supabaseAdmin
        .from('invites')
        .select('*')
        .eq('token_hash', hashed)
        .maybeSingle();

    // Fallback to raw token lookup for legacy invites
    let resolvedInvite = invite;
    if (!resolvedInvite) {
        const { data: legacy } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('token', token)
            .maybeSingle();
        resolvedInvite = legacy;
    }

    if (!resolvedInvite) {
        return { success: false, error: 'رمز الدعوة غير صالح أو منتهي الصلاحية' };
    }

    if (resolvedInvite.used_at) {
        return { success: false, error: 'تم استخدام هذه الدعوة مسبقاً' };
    }

    if (new Date(resolvedInvite.expires_at) < new Date()) {
        return { success: false, error: 'انتهت صلاحية الدعوة' };
    }

    try {
        // 2. Create Auth User
        const authEmail = resolvedInvite.email || `${resolvedInvite.mobile_number.replace(/\+/g, '')}@school-os.local`;

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: resolvedInvite.full_name,
                mobile_number: resolvedInvite.mobile_number,
            },
        });

        if (authError) {
            console.error('[joinSchool] Auth error:', authError);
            return { success: false, error: 'فشل في إنشاء الحساب' };
        }

        const userId = authData.user.id;

        // 3. Upsert Profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: userId,
            email: authEmail,
            full_name: resolvedInvite.full_name,
            mobile_number: resolvedInvite.mobile_number,
            system_role: 'system_user',
            is_onboarded: false,
        });

        if (profileError) {
            console.error('[joinSchool] Profile error:', profileError);
            // Don't fail - user is created, profile can be fixed later
        }

        // 4. Create Persona (Critical for Phase 2)
        const { error: personaError } = await supabaseAdmin.from('user_personas').insert({
            user_id: userId,
            school_id: resolvedInvite.target_school_id,
            role: resolvedInvite.target_role,
            is_primary: true,
            job_title: 'عضو جديد',
        });

        if (personaError) {
            console.error('[joinSchool] Persona error:', personaError);
            // Don't fail - persona can be created later
        }

        // 5. Mark invite as used
        await supabaseAdmin
            .from('invites')
            .update({ used_at: new Date().toISOString() })
            .eq('id', resolvedInvite.id);

        return { success: true, email: authEmail };

    } catch (err) {
        console.error('[joinSchool] Unexpected error:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}
