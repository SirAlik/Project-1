'use server';

import { createSafeAction } from '@/lib/safe-action';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { UserRole } from '@/lib/auth/roles';

// Allowed roles: only coordinator (and admins)
// Allowed roles: only coordinator (and admins)
const COORDINATOR_ROLES: UserRole[] = [
    'system_owner',
    'school_admin',
    'school_principal',
    'school_affairs_vp',
];

// === Internal Query Types ===

type PersonaWithProfile = {
    user_id: string;
    role: string;
    profiles: { id: string; full_name: string; email: string } | null;
};

// === Schemas ===

const getSchoolClassroomsSchema = z.object({
    schoolId: z.string().uuid(),
});

const getClassTimetableSchema = z.object({
    classId: z.string().uuid(),
});

const getSchoolTeachersSchema = z.object({
    schoolId: z.string().uuid(),
});

const assignTeacherSchema = z.object({
    slotId: z.string().uuid(),
    teacherId: z.string().uuid(),
});

// === Actions ===

export const getSchoolClassrooms = createSafeAction({
    schema: getSchoolClassroomsSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'list_classrooms',
        resource: 'classes',
    },

    async handler({ schoolId }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('school_id', schoolId)
            .order('grade_level', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('[getSchoolClassrooms] Supabase Error:', JSON.stringify(error, null, 2));
            throw new Error(`فشل في جلب الفصول الدراسية: ${error.message}`);
        }

        return data || [];
    },
});

export const getClassTimetable = createSafeAction({
    schema: getClassTimetableSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'view_timetable',
        resource: 'timetable',
    },

    async handler({ classId }) {
        const { data, error } = await supabaseAdmin
            .from('timetable_slots')
            .select(`
        *,
        subjects (id, name_ar, name_en),
        teacher: profiles!teacher_id (id, full_name),
        period: periods (id, number, label, start_time, end_time)
      `)
            .eq('class_id', classId)
            .order('day', { ascending: true });

        if (error) {
            console.error('[getClassTimetable] Error:', error);
            throw new Error('فشل في جلب الجدول الدراسي');
        }

        return data || [];
    },
});

export const getSchoolTeachers = createSafeAction({
    schema: getSchoolTeachersSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'list_teachers',
        resource: 'staff',
    },

    async handler({ schoolId }) {
        const { data, error } = await supabaseAdmin
            .from('user_personas')
            .select(`
        user_id,
        role,
        profiles: user_id (id, full_name, email)
      `)
            .eq('school_id', schoolId)
            .eq('role', 'teacher');

        if (error) {
            console.error('[getSchoolTeachers] Error:', error);
            throw new Error('فشل في جلب قائمة المعلمين');
        }

        return ((data ?? []) as unknown as PersonaWithProfile[])
            .map((r) => r.profiles)
            .filter(Boolean);
    },
});

export const assignTeacherToSlot = createSafeAction({
    schema: assignTeacherSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'assign_teacher',
        resource: 'timetable',
    },

    async handler({ slotId, teacherId }) {
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('timetable_slots')
            .select('teacher_id')
            .eq('id', slotId)
            .single();

        if (fetchError) {
            console.error('[assignTeacherToSlot] Fetch Error:', fetchError);
            throw new Error('فشل في جلب بيانات الحصة');
        }

        if (existing.teacher_id === teacherId) {
            return existing;
        }

        const { data, error } = await supabaseAdmin
            .from('timetable_slots')
            .update({ teacher_id: teacherId })
            .eq('id', slotId)
            .select()
            .single();

        if (error) {
            console.error('[assignTeacherToSlot] Error:', error);
            throw new Error('فشل في تعيين المعلم');
        }

        return data;
    },
});

const createClassSchema = z.object({
    schoolId: z.string().uuid(),
    name: z.string().min(2, 'اسم الفصل قصير جداً'),
    gradeLevel: z.string().min(1, 'يجب اختيار الصف الدراسي'),
    gender: z.enum(['boy', 'girl', 'mixed']),
});

export const createClass = createSafeAction({
    schema: createClassSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'create_class',
        resource: 'classes',
    },

    async handler({ schoolId, name, gradeLevel, gender }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .insert({
                school_id: schoolId,
                name,
                grade_level: gradeLevel,
                gender,
            })
            .select()
            .single();

        if (error) {
            console.error('[createClass] Supabase Error:', JSON.stringify(error, null, 2));

            if (error.code === '23505') {
                throw new Error('اسم الفصل هذا مسجل مسبقاً في مدرستك');
            }

            throw new Error(`فشل في إنشاء الفصل: ${error.message}`);
        }

        revalidatePath(`/school/${schoolId}/classroom`);
        return data;
    },
});

const checkClassNameSchema = z.object({
    schoolId: z.string().uuid(),
    name: z.string().min(1),
});

export const checkClassName = createSafeAction({
    schema: checkClassNameSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'check_class_name',
        resource: 'classes',
    },

    async handler({ schoolId, name }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('school_id', schoolId)
            .eq('name', name)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[checkClassName] Error:', error);
            return { available: false };
        }

        return { available: !data };
    },
});

const resetSchoolClassesSchema = z.object({
    schoolId: z.string().uuid(),
});

export const resetSchoolClasses = createSafeAction({
    schema: resetSchoolClassesSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'reset_classes',
        resource: 'classes',
    },

    async handler({ schoolId }) {
        const { error } = await supabaseAdmin
            .from('classes')
            .delete()
            .eq('school_id', schoolId);

        if (error) {
            console.error('[resetSchoolClasses] Error:', error);
            throw new Error('فشل في إعادة تعيين الفصول');
        }

        revalidatePath(`/school/${schoolId}/classroom`);
        return { success: true };
    },
});

// ============================================================================
// PHASE B: Production-Grade Staff Actions
// Staff = all users with user_personas entries for the school + pending invites
// ============================================================================

/**
 * Allowed staff roles that can be assigned via createStaff.
 * Excludes privileged system-level roles to prevent escalation.
 */
/**
 * Allowed staff roles that can be assigned via createStaff.
 * Excludes privileged system-level roles to prevent escalation.
 */
const ALLOWED_STAFF_ROLES = [
    'school_principal',
    'school_affairs_vp',
    'student_affairs_vp',
    'student_counselor',
    'teacher',
    'school_secretary',
    'health_coordinator',
    'lab_technician',
    'school_librarian',
    'activity_leader',
    'school_admin',
] as const;

type AllowedStaffRole = (typeof ALLOWED_STAFF_ROLES)[number];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Secure token (Base64URL) */
function generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
}

/** Staff member output types for unified list */
export type ActiveStaffMember = {
    kind: 'active';
    id: string;
    full_name: string;
    email: string;
    roles: string[];
    status: 'active';
};

export type InvitedStaffMember = {
    kind: 'invite';
    id: string;
    full_name: string;
    email: string | null;
    roles: string[];
    status: 'pending' | 'expired';
    created_at: string;
};

export type StaffMember = ActiveStaffMember | InvitedStaffMember;

const getSchoolStaffSchema = z.object({
    schoolId: z.string().uuid(),
});

/**
 * Fetches a unified staff list for the school including:
 * - Active staff: from user_personas joined with profiles
 * - Pending invites: from invites where used_at IS NULL
 *
 * Results are deduplicated by email (active users take precedence).
 * Sorting: active first (alphabetical), then invites (alphabetical).
 */
export const getSchoolStaff = createSafeAction({
    schema: getSchoolStaffSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'list_staff',
        resource: 'staff',
    },

    async handler({ schoolId }): Promise<StaffMember[]> {
        // 1) Active staff from user_personas
        const { data: rolesData, error: rolesError } = await supabaseAdmin
            .from('user_personas')
            .select(`
        user_id,
        role,
        profiles: user_id (id, full_name, email)
      `)
            .eq('school_id', schoolId);

        if (rolesError) {
            console.error('[getSchoolStaff] Roles Error:', rolesError);
            throw new Error('فشل في جلب قائمة الموظفين');
        }

        // 2) Aggregate roles per user
        const activeStaffMap = new Map<string, ActiveStaffMember>();
        const activeEmails = new Set<string>();

        for (const row of (rolesData ?? []) as unknown as PersonaWithProfile[]) {
            const profile = row.profiles;
            if (!profile) continue;

            const email = profile.email ? normalizeEmail(profile.email) : '';
            if (email) activeEmails.add(email);

            const existing = activeStaffMap.get(profile.id);
            if (existing) {
                if (!existing.roles.includes(row.role)) {
                    existing.roles.push(row.role);
                }
            } else {
                activeStaffMap.set(profile.id, {
                    kind: 'active',
                    id: profile.id,
                    full_name: profile.full_name ?? '',
                    email: profile.email ?? '',
                    roles: [row.role],
                    status: 'active',
                });
            }
        }

        // 3) Pending invites (Phase B schema only)
        const { data: invitesData, error: invitesError } = await supabaseAdmin
            .from('invites')
            .select('id, full_name, email, target_role, created_at, expires_at, used_at, target_school_id')
            .eq('target_school_id', schoolId)
            .is('used_at', null);

        if (invitesError) {
            console.error('[getSchoolStaff] Invites Error:', invitesError);
            // Non-fatal: return active only
            const activeOnly = Array.from(activeStaffMap.values())
                .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
            return activeOnly;
        }

        // 4) Aggregate invites by email (skip if already active)
        const inviteMap = new Map<string, InvitedStaffMember>();
        const now = new Date();

        for (const invite of invitesData ?? []) {
            const inviteEmail = invite.email ? normalizeEmail(invite.email) : null;

            // If email exists as active user, ignore invite
            if (inviteEmail && activeEmails.has(inviteEmail)) continue;

            // Dedup key: email if present, otherwise invite.id
            const key = inviteEmail ?? invite.id;

            const isExpired =
                Boolean(invite.expires_at) && new Date(invite.expires_at!) < now;

            const existing = inviteMap.get(key);
            if (existing) {
                if (!existing.roles.includes(invite.target_role)) {
                    existing.roles.push(invite.target_role);
                }
                // status stays: if any invite is pending, keep pending; otherwise expired
                if (existing.status !== 'pending' && !isExpired) {
                    existing.status = 'pending';
                }
            } else {
                inviteMap.set(key, {
                    kind: 'invite',
                    id: invite.id,
                    full_name: invite.full_name ?? '',
                    email: invite.email,
                    roles: [invite.target_role],
                    status: isExpired ? 'expired' : 'pending',
                    created_at: invite.created_at ?? '',
                });
            }
        }

        // 5) Sort: active first then invites
        const activeList = Array.from(activeStaffMap.values())
            .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));

        const inviteList = Array.from(inviteMap.values())
            .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));

        return [...activeList, ...inviteList];
    },
});

/**
 * ✅ CHANGED: mobileNumber صار اختياري مؤقتًا حتى لا يكسر staff/new/page.tsx
 * - National ID يبقى REQUIRED (حسب طلبك)
 * - إذا ما توفر رقم جوال الآن، نرسله NULL (إن كان العمود موجود)
 */
const createStaffSchema = z.object({
    schoolId: z.string().uuid(),
    fullName: z.string().min(2, 'الاسم قصير جداً'),
    email: z.string().email('البريد الإلكتروني غير صالح'),

    // NATIONAL ID يبقى مطلوب
    nationalId: z.string().min(10, 'رقم الهوية غير صالح'),

    // ✅ Optional for now (UI does not provide it yet)
    mobileNumber: z.string().min(8, 'رقم الجوال غير صالح').optional(),

    roles: z.array(z.string()).min(1, 'يجب اختيار دور واحد على الأقل'),
});

/** Result type for createStaff action */
export type CreateStaffResult = {
    outcome: 'assigned' | 'invited';
    userId?: string;
    inviteCount?: number;
    roles: string[];
};

/**
 * Creates or assigns staff to a school.
 *
 * PATH A (Existing User):
 * - If a user exists by profiles.email, upsert user_personas entries (idempotent).
 *
 * PATH B (New User):
 * - Create invite records (one per role) using Phase B schema:
 *   token + expires_at + target_school_id + target_role + email/full_name (+ optional mobile_number if exists in schema).
 *
 * Security:
 * - Rejects privileged roles (system_owner) via whitelist.
 *
 * NOTE ON NATIONAL ID:
 * - nationalId is required in input (business requirement)
 * - We DO NOT store it into invites unless your DB schema has a dedicated national_id column.
 */
export const createStaff = createSafeAction({
    schema: createStaffSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'create_staff',
        resource: 'staff',
    },

    async handler({ schoolId, fullName, email, mobileNumber, roles }): Promise<CreateStaffResult> {
        const cleanEmail = normalizeEmail(email);

        // ─── DEBUG: trace context for staff creation diagnosis ───
        console.log('[createStaff] Handler entry:', {
            requestedSchoolId: schoolId,
            email: cleanEmail,
            rolesRequested: roles,
            // NOTE: persona context is checked by createSafeAction BEFORE reaching here
            // If we reach this point, auth + RBAC + school-match all passed
        });

        // 1) Validate roles strictly
        const validRoles = roles.filter((r): r is AllowedStaffRole =>
            ALLOWED_STAFF_ROLES.includes(r as AllowedStaffRole)
        );

        if (validRoles.length === 0) {
            throw new Error('لم يتم تحديد أدوار صالحة');
        }

        // 2) Existing user check (by profiles.email)
        const { data: existingUser, error: existingUserError } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .ilike('email', cleanEmail)
            .maybeSingle();

        if (existingUserError) {
            console.error('[createStaff] Existing user lookup error:', existingUserError);
            // Continue as "new user" if lookup fails
        }

        if (existingUser?.id) {
            // PATH A: Upsert user_personas (idempotent)
            const roleInserts = validRoles.map((role) => ({
                user_id: existingUser.id,
                school_id: schoolId,
                role,
            }));

            const { error: upsertError } = await supabaseAdmin
                .from('user_personas')
                .upsert(roleInserts, {
                    onConflict: 'user_id,school_id,role',
                    ignoreDuplicates: true,
                });

            if (upsertError) {
                console.error('[createStaff] Upsert Error:', upsertError);
                throw new Error(`فشل في تعيين الأدوار: ${upsertError.message}`);
            }

            revalidatePath(`/school/${schoolId}/staff`);
            return {
                outcome: 'assigned',
                userId: existingUser.id,
                roles: validRoles,
            };
        }

        // PATH B: New user -> create invites (Phase B schema)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Fetch existing unused invites for this email+school to avoid duplicates
        const { data: existingInvites, error: existingInvitesError } = await supabaseAdmin
            .from('invites')
            .select('target_role, email, used_at')
            .eq('target_school_id', schoolId)
            .ilike('email', cleanEmail)
            .is('used_at', null);

        if (existingInvitesError) {
            console.error('[createStaff] Existing invites lookup error:', existingInvitesError);
        }

        const existingInviteRoles = new Set((existingInvites ?? []).map((i) => i.target_role));
        const rolesToInvite = validRoles.filter((r) => !existingInviteRoles.has(r));

        if (rolesToInvite.length === 0) {
            return {
                outcome: 'invited',
                inviteCount: 0,
                roles: validRoles,
            };
        }

        // Build invite records (one per role)
        // ✅ mobile_number becomes null if not provided
        // ❗ nationalId is not stored here until schema supports it
        const inviteRecords = rolesToInvite.map((role) => ({
            token: generateSecureToken(32),
            email: cleanEmail,
            full_name: fullName,
            target_role: role,
            target_school_id: schoolId,
            expires_at: expiresAt.toISOString(),

            // If invites table has this column, it will store it. If NULL, it's fine.
            mobile_number: mobileNumber ?? null,

            // national_id intentionally NOT stored to avoid schema mismatch/corruption
        }));

        const { error: insertError } = await supabaseAdmin
            .from('invites')
            .insert(inviteRecords);

        if (insertError) {
            console.error('[createStaff] Insert Error:', insertError);
            throw new Error(`فشل في إنشاء الدعوة: ${insertError.message}`);
        }

        revalidatePath(`/school/${schoolId}/staff`);
        return {
            outcome: 'invited',
            inviteCount: rolesToInvite.length,
            roles: validRoles,
        };
    },
});