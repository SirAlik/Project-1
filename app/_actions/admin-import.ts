/**
 * Admin Import Actions
 * ====================
 * Server actions for bulk user/student imports.
 * Uses Safe Action pattern for validation, RBAC, and audit logging.
 * 
 * OPTIMIZATIONS:
 * - N+1 FIX: Fetches all users ONCE before import loop
 * - O(1) LOOKUP: Uses Map<email, User> for fast lookups
 * - CHUNKING: Processes large files in batches of 50
 */

'use server';

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { revalidatePath } from 'next/cache';
import { createSafeAction } from '@/lib/safe-action';
import type { User } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { SCHOOL_ROLES, UserRole } from '@/lib/auth/roles';

const UPLOAD_ROLES: UserRole[] = ['system_owner', 'school_admin'];



function normalizeMobile(mobile: string): string {
    const digits = mobile.replace(/\D/g, '');
    if (digits.startsWith('966')) return '+' + digits;
    if (digits.startsWith('05')) return '+966' + digits.substring(1);
    return '+' + digits;
}

const importRowSchema = z.object({
    email: z.string().email('بريد إلكتروني غير صالح'),
    full_name: z.string().min(2, 'الاسم مطلوب'),
    national_id: z.string().optional(),
    phone: z.string().min(9, 'رقم الجوال مطلوب'), // Was parent_phone, standardized to phone
    parent_phone: z.string().optional(), // Kept for backward compat if needed, but phone is primary

    // Support comma-separated roles like "Teacher, Parent"
    // Phase 2: Validate against allowed SCHOOL_ROLES
    role: z.string().refine(val => {
        const roles = val.split(',').map(r => r.trim());
        // Check if every role is a valid member of SCHOOL_ROLES set
        return roles.every(r => SCHOOL_ROLES.has(r as UserRole));
    }, { message: 'أحد الأدوار المدخلة غير صالح أو غير معرف في النظام' }),

    class_id: z.string().uuid().optional(),
    academic_year_id: z.string().uuid().optional(),
});

const validateImportSchema = z.object({
    entries: z.array(z.object({
        index: z.number(),
        row: importRowSchema,
    })),
});

const executeImportSchema = z.object({
    rows: z.array(importRowSchema),
    schoolId: z.string().uuid('معرف المدرسة غير صالح'),
});

// ============================================================
// TYPES
// ============================================================

export type ImportRow = z.infer<typeof importRowSchema>;

export interface ValidationRowResult {
    row: number;
    success: boolean;
    isUpdate: boolean;
    error?: string;
}

export interface ImportExecutionResult {
    created: number;
    updated: number;
    errors: number;
    errorDetails: Array<{ email: string; error: string }>;
}

/** Summary from DryRun validation step */
export interface ValidationSummary {
    success: boolean;
    readyCount: number;
    updateCount: number;
    errorCount: number;
    errors: Array<{ row: number; msg: string; data: ImportRow }>;
    summary: string;
}

/** @deprecated Use ImportExecutionResult or ValidationSummary instead */
export type ImportResult = ValidationSummary;

// ============================================================
// CONSTANTS
// ============================================================

const CHUNK_SIZE = 50; // Process imports in batches of 50

// ============================================================
// SAFE ACTIONS
// ============================================================

/**
 * Validates import data before execution.
 * Returns which rows are new vs updates.
 */
export const validateImportData = createSafeAction({
    schema: validateImportSchema,
    allowedRoles: UPLOAD_ROLES,
    requiresSchoolContext: false,

    async handler(input): Promise<ValidationRowResult[]> {
        const results: ValidationRowResult[] = [];

        // 1. Batch fetch all existing emails (O(1) lookup setup)
        const emails = input.entries.map(e => e.row.email).filter(Boolean);
        const { data: existingProfiles, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .in('email', emails);

        if (fetchError) {
            console.error('[validateImportData] Error fetching profiles:', fetchError);
            throw new Error('فشل في جلب البيانات من قاعدة البيانات');
        }

        const existingEmailSet = new Set(existingProfiles?.map(p => p.email) || []);

        // 2. Validate each entry
        for (const entry of input.entries) {
            const { row, index } = entry;
            const rowIndex = index + 1;

            // Server-side validation (Zod already validated, but double-check required fields)
            if (!row.email || !row.full_name) {
                results.push({
                    row: rowIndex,
                    success: false,
                    isUpdate: false,
                    error: 'البريد الإلكتروني والاسم مطلوبان',
                });
                continue;
            }

            results.push({
                row: rowIndex,
                success: true,
                isUpdate: existingEmailSet.has(row.email),
            });
        }

        return results;
    },
});

/**
 * Executes the import with N+1 optimization.
 * Fetches all users ONCE, then processes in chunks.
 */
export const executeImport = createSafeAction({
    schema: executeImportSchema,
    allowedRoles: UPLOAD_ROLES,
    requiresSchoolContext: true,

    audit: {
        action: 'bulk_import',
        resource: 'users',
        maskFields: ['email', 'parent_phone'],
    },

    async handler(input, ctx): Promise<ImportExecutionResult> {
        const results: ImportExecutionResult = {
            created: 0,
            updated: 0,
            errors: 0,
            errorDetails: [],
        };

        // ============================================================
        // N+1 FIX: Fetch ALL users ONCE before the loop
        // ============================================================
        const { data: usersResponse } = await supabaseAdmin.auth.admin.listUsers();
        const allUsers = usersResponse.users;

        // Create O(1) lookup map by email
        const userMap = new Map<string, User>();
        for (const user of allUsers) {
            if (user.email) {
                userMap.set(user.email.toLowerCase(), user);
            }
        }

        // ============================================================
        // CHUNKING: Process in batches to prevent timeouts
        // ============================================================
        const chunks: ImportRow[][] = [];
        for (let i = 0; i < input.rows.length; i += CHUNK_SIZE) {
            chunks.push(input.rows.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
            await processChunk(chunk, userMap, input.schoolId, results, ctx.user.userId);
        }

        revalidatePath('/admin/setup');
        revalidatePath('/admin/dashboard');

        return results;
    },
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Processes a chunk of import rows.
 */
async function processChunk(
    rows: ImportRow[],
    userMap: Map<string, User>,
    schoolId: string,
    results: ImportExecutionResult,
    executorId: string
): Promise<void> {
    for (const row of rows) {
        try {
            const emailLower = row.email.toLowerCase();
            let userId: string;

            // O(1) lookup instead of N+1 API calls
            const existingUser = userMap.get(emailLower);

            if (!existingUser) {
                // ============================================================
                // IDENTITY FORGE REFACTOR (Phase 1)
                // Replaced Random Password -> Invite Model
                // ============================================================

                // 1. Generate Invite
                const normalizedMobile = normalizeMobile(row.phone || '');
                const inviteToken = randomBytes(24).toString('hex');

                // 2. Insert Invite Record (replacing immediate Auth User creation)
                const { error: inviteError } = await supabaseAdmin.from('invites').insert({
                    token: inviteToken,
                    full_name: row.full_name,
                    email: row.email, // Kept optional/secondary
                    mobile_number: normalizedMobile,
                    target_role: row.role,
                    target_school_id: schoolId,
                    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                    created_by: executorId
                });

                if (inviteError) {
                    throw new Error(`Create Invite Error: ${inviteError.message}`);
                }

                results.created++;
                // Add to results for CSV download (Proposed Feature)
                // For now, we just count it.

                // Note: We DO NOT add to userMap because user doesn't exist yet.
                // Loop continues to next row.
                continue;
            } else {
                userId = existingUser.id;
                results.updated++;
            }


            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: userId,
                    email: row.email,
                    full_name: row.full_name,
                });

            if (profileError) {
                throw new Error(profileError.message);
            }

            // Upsert into user_personas table
            await upsertUserRoles(userId, row.role, schoolId);

            // If Student: Create student profile and enrollment
            if (row.role === 'student') {
                await createStudentRecords(userId, row, schoolId);
            }

        } catch (err) {
            console.error('[executeImport] Error for row:', row.email, err);
            results.errors++;
            results.errorDetails.push({
                email: row.email,
                error: err instanceof Error ? err.message : 'خطأ غير معروف',
            });
        }
    }
}

/**
 * Upserts user personas into the user_personas table.
 * Supports comma-separated roles like "teacher, school_admin".
 */
async function upsertUserRoles(
    userId: string,
    roleString: string,
    schoolId: string
): Promise<void> {
    const roles = roleString.includes(',')
        ? roleString.split(',').map(r => r.trim().toLowerCase())
        : [roleString.toLowerCase()];

    for (const role of roles) {
        if (!role) continue;

        const { error } = await supabaseAdmin
            .from('user_personas')
            .upsert(
                {
                    user_id: userId,
                    role: role,
                    school_id: schoolId,
                },
                {
                    onConflict: 'user_id,school_id,role',
                    ignoreDuplicates: true,
                }
            );

        if (error) {
            console.warn(`[upsertUserRoles] Failed for ${userId}/${role}:`, error.message);
        }
    }
}

/**
 * Creates student profile and enrollment records.
 */
async function createStudentRecords(
    userId: string,
    row: ImportRow,
    schoolId: string
): Promise<void> {
    // 1. Upsert student profile
    const { error: studentError } = await supabaseAdmin
        .from('student_profiles')
        .upsert({
            id: userId,
            name: row.full_name,
            // national_id removed
            parent_phone: row.parent_phone,
            school_id: schoolId,
        });

    if (studentError) {
        throw new Error(studentError.message);
    }

    // 2. Create enrollment if class and year specified
    if (row.class_id && row.academic_year_id) {
        const { error: enrollmentError } = await supabaseAdmin
            .from('student_enrollments')
            .upsert({
                student_id: userId,
                class_id: row.class_id,
                academic_year_id: row.academic_year_id,
                is_active: true,
            });

        if (enrollmentError) {
            throw new Error(enrollmentError.message);
        }
    }
}


// ============================================================
// LEGACY EXPORTS (Backward Compatibility)
// ============================================================

/**
 * @deprecated Use the new Safe Action `validateImportData` instead.
 * Kept for backward compatibility.
 */
export async function validateImportDataLegacy(
    entries: { index: number; row: ImportRow }[]
): Promise<ValidationRowResult[]> {
    const result = await validateImportData({ entries });
    if (result.data) return result.data;
    if (result.serverError) throw new Error(result.serverError);
    return [];
}

