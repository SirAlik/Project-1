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
