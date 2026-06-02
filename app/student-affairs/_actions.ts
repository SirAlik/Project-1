/**
 * Student Affairs — Server Actions
 * ==================================
 * إجراءات الخادم لوحدة شؤون الطلاب.
 * تستخدم createSafeAction لضمان التحقق من الهوية وعزل المستأجر.
 */

'use server';

import { z } from 'zod';
import { createSafeAction } from '@/lib/safe-action';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';
import type { UserRole } from '@/lib/auth/roles';

// ============================================================
// الأدوار المسموح لها بإدراج الطلاب
// ============================================================

const ALLOWED_ROLES: UserRole[] = [
    'system_owner',
    'school_admin',
    'school_principal',
    'student_affairs_vp',
];

// ============================================================
// مخطط التحقق لصف واحد
// ============================================================

const studentRowSchema = z.object({
    name:        z.string().min(1, 'الاسم مطلوب'),
    national_id: z.string().optional(),
    class_id:    z.string().uuid('معرف الفصل غير صالح'),
    grade_level: z.number().int().optional(),
});

const bulkInsertSchema = z.object({
    rows: z.array(studentRowSchema).min(1, 'لا توجد صفوف للاستيراد'),
});

export type BulkInsertInput  = z.infer<typeof bulkInsertSchema>;
export type BulkInsertResult = { success: number; errors: string[] };

// ============================================================
// Action: استيراد جماعي للطلاب
// ============================================================

export const bulkInsertStudentsAction = createSafeAction<BulkInsertInput, BulkInsertResult>({
    schema: bulkInsertSchema,
    allowedRoles: ALLOWED_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'BULK_INSERT_STUDENTS',
        resource: 'student_profiles',
    },
    handler: async (input, ctx) => {
        // schoolId مضمون من createSafeAction عبر requiresSchoolContext
        const schoolId = ctx.user.schoolId;

        if (!schoolId) {
            // لن يصل هنا نظراً لـ requiresSchoolContext، لكن للأمان
            return { success: 0, errors: ['غير مصرح: المدرسة غير محددة'] };
        }

        let successCount = 0;
        const errors: string[] = [];

        for (const row of input.rows) {
            const { error } = await supabaseAdmin
                .from('student_profiles')
                .insert({
                    name:        row.name,
                    national_id: row.national_id ?? null,
                    class_id:    row.class_id,
                    school_id:   schoolId,
                    ...(row.grade_level !== undefined ? { grade_level: row.grade_level } : {}),
                });

            if (error) {
                errors.push(`خطأ في الطالب "${row.name}": ${error.message}`);
            } else {
                successCount++;
            }
        }

        return { success: successCount, errors };
    },
});

// ============================================================
// Convenience wrapper: يُرجع نتيجة مباشرة بدون ActionResult
// يُستخدم من BulkUploadModal عبر Server Action مباشر
// ============================================================

export async function bulkInsertStudentsDirect(
    rows: { name: string; national_id?: string; class_id: string; grade_level?: number }[]
): Promise<BulkInsertResult> {
    // التحقق من الهوية والمدرسة
    const persona = await getActivePersona();

    if (!persona) {
        return { success: 0, errors: ['غير مصرح: يجب تسجيل الدخول'] };
    }

    if (!persona.schoolId && !persona.isSystemOwner) {
        return { success: 0, errors: ['غير مصرح: يجب تحديد المدرسة أولاً'] };
    }

    if (!ALLOWED_ROLES.includes(persona.role)) {
        return { success: 0, errors: ['غير مصرح: دورك لا يسمح باستيراد الطلاب'] };
    }

    const schoolId = persona.schoolId;
    if (!schoolId) {
        return { success: 0, errors: ['غير مصرح: المدرسة غير محددة'] };
    }

    // التحقق من المدخلات
    const parsed = bulkInsertSchema.safeParse({ rows });
    if (!parsed.success) {
        return {
            success: 0,
            errors: parsed.error.issues.map((i) => i.message),
        };
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const row of parsed.data.rows) {
        const { error } = await supabaseAdmin
            .from('student_profiles')
            .insert({
                name:        row.name,
                national_id: row.national_id ?? null,
                class_id:    row.class_id,
                school_id:   schoolId,
                ...(row.grade_level !== undefined ? { grade_level: row.grade_level } : {}),
            });

        if (error) {
            errors.push(`خطأ في الطالب "${row.name}": ${error.message}`);
        } else {
            successCount++;
        }
    }

    return { success: successCount, errors };
}

// ============================================================
// Behavioral & Attendance Actions
// ============================================================

import type { StudentProfile, AttendanceStatus } from '@/lib/types/student-affairs';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

type AR = { ok: boolean; error?: string };

export async function markAttendanceAction(
    studentId: string,
    status: AttendanceStatus,
    metadata: Record<string, unknown> = {},
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('student_attendance').upsert({
        student_id: studentId,
        attendance_date: new Date().toISOString().split('T')[0],
        status,
        ...metadata,
        recorded_by: persona.userId,
        school_id: persona.schoolId,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function sendToCounselorAction(referralId: string, vpNotes: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('behavioral_referrals')
        .update({
            vp_notes: vpNotes,
            vp_sent_at: new Date().toISOString(),
            status: 'pending_counselor',
        })
        .eq('id', referralId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function resolveReferralAction(
    referralId: string,
    counselorAction: string,
    counselorNotes?: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('behavioral_referrals')
        .update({
            counselor_action: counselorAction,
            counselor_notes: counselorNotes,
            counselor_resolved_at: new Date().toISOString(),
            status: 'resolved',
        })
        .eq('id', referralId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function escalateReferralAction(referralId: string, reason: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('behavioral_referrals')
        .update({ status: 'escalated', vp_notes: `Escalated: ${reason}` })
        .eq('id', referralId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function issueAssetAction(
    studentId: string,
    assetName: string,
    assetType: string = 'book',
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('student_assets').insert([{
        student_id: studentId,
        asset_name: assetName,
        asset_type: assetType,
        handover_by: persona.userId,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function returnAssetAction(assetId: string, condition: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('student_assets')
        .update({
            return_date: new Date().toISOString().split('T')[0],
            return_condition: condition,
            status: 'returned',
            return_by: persona.userId,
        })
        .eq('id', assetId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateStudentProfileAction(
    studentId: string,
    updates: Partial<Omit<StudentProfile, 'id' | 'school_id'>>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('student_profiles')
        .update(updates)
        .eq('id', studentId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function signContractAction(contractId: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('behavioral_contracts')
        .update({ parent_signature_date: new Date().toISOString() })
        .eq('id', contractId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
