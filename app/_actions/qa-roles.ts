'use server';

/**
 * أدوات اختبار مالك النظام — إسناد/إزالة أدوار مدرسية لحساب مالك النظام نفسه (Pre-launch QA).
 * ==================================================================================
 * أمان (كلّه خادمي):
 *  - الهوية من getActivePersona() (تتحقّق من app_metadata — مصدر السلطة، لا الكوكي).
 *  - الفاعل يجب أن يكون system_owner حقيقياً (persona.isSystemOwner).
 *  - الهدف دائماً = المستخدم المُصادَق الحالي (persona.userId) — لا يُقبل user_id من العميل أبداً.
 *  - عزل المستأجر: school_id من المسار، والتحقق من وجود المدرسة.
 *  - أدوار مدرسية صالحة فقط (QA_ASSIGNABLE_ROLES): لا system_owner، ولا student/parent.
 *  - upsert idempotent بمفتاح (user_id, school_id, role) → بلا تكرار، مع الحفاظ على الموجود.
 *  - تدقيق في action_audit_log (school_id من المسار = NOT NULL محقّق).
 *
 * ملاحظة معمارية: سلطة system_owner تعيش في app_metadata لا في user_personas (school_id NOT NULL يمنع
 * وجود persona عالمي)، لذا إزالة personas مدرسية لا يمكن أن تُسقط دور مالك النظام إطلاقاً.
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';
import { isAssignableQaRole } from '@/lib/auth/qa-test-roles';
import type { UserRole } from '@/lib/auth/roles';

const inputSchema = z.object({
    schoolId: z.string().uuid(),
    roles: z.array(z.string()).min(1, 'اختر دوراً واحداً على الأقل'),
});

export interface QaRolesResult {
    success: boolean;
    message: string;
    affectedRoles?: UserRole[];
}

// تحقّق مشترك: هوية + سلطة مالك النظام + وجود المدرسة. يُعيد userId عند النجاح أو رسالة خطأ.
async function authorizeOwner(
    schoolId: string,
): Promise<{ ok: true; userId: string; role: string } | { ok: false; message: string }> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, message: 'يرجى تسجيل الدخول للمتابعة.' };
    if (!persona.isSystemOwner) {
        return { ok: false, message: 'هذه الأداة مخصصة لمالك النظام فقط.' };
    }

    const { data: school, error } = await supabaseAdmin
        .from('schools')
        .select('id')
        .eq('id', schoolId)
        .maybeSingle();

    if (error || !school) return { ok: false, message: 'المدرسة غير موجودة.' };

    return { ok: true, userId: persona.userId, role: persona.role };
}

/** قراءة أدوار المستخدم الحالي (نفسه) في مدرسة محددة — تُستخدم لعرض الحالة في الأداة. */
export async function getMySchoolPersonas(schoolId: string): Promise<UserRole[]> {
    const persona = await getActivePersona();
    if (!persona) return [];

    const { data, error } = await supabaseAdmin
        .from('user_personas')
        .select('role')
        .eq('user_id', persona.userId)
        .eq('school_id', schoolId);

    if (error || !data) return [];
    return data.map((r) => r.role as UserRole);
}

/** إسناد أدوار اختبار مدرسية لحساب مالك النظام الحالي. */
export async function assignTestRolesToSelf(input: {
    schoolId: string;
    roles: string[];
}): Promise<QaRolesResult> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: 'مدخلات غير صالحة.' };
    const { schoolId, roles } = parsed.data;

    const auth = await authorizeOwner(schoolId);
    if (!auth.ok) return { success: false, message: auth.message };

    // أدوار مدرسية قابلة للإسناد فقط (يستبعد system_owner و student/parent وأي قيمة غريبة).
    const validRoles = roles.filter(isAssignableQaRole);
    if (validRoles.length === 0) {
        return { success: false, message: 'لم يتم اختيار أدوار قابلة للإسناد.' };
    }

    // الهدف دائماً = المستخدم الحالي (auth.userId) — لا يُقبل user_id من العميل.
    const rows = validRoles.map((role) => ({
        user_id: auth.userId,
        school_id: schoolId,
        role,
    }));

    const { error: upsertError } = await supabaseAdmin
        .from('user_personas')
        .upsert(rows, { onConflict: 'user_id,school_id,role', ignoreDuplicates: true });

    if (upsertError) {
        console.error('[assignTestRolesToSelf] upsert error:', upsertError);
        return { success: false, message: 'تعذّر إضافة أدوار الاختبار.' };
    }

    await writeAudit('qa_assign_test_roles', auth.userId, auth.role, schoolId, validRoles);

    revalidatePath(`/school/${schoolId}/staff`);
    revalidatePath('/portal');

    return {
        success: true,
        message: `تمت إضافة ${validRoles.length} دور اختبار لحسابك. يمكنك التبديل إليها من البوابة.`,
        affectedRoles: validRoles,
    };
}

/** إزالة آمنة لأدوار اختبار مدرسية من حساب مالك النظام الحالي (لا تمسّ سلطة system_owner). */
export async function removeTestRolesFromSelf(input: {
    schoolId: string;
    roles: string[];
}): Promise<QaRolesResult> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: 'مدخلات غير صالحة.' };
    const { schoolId, roles } = parsed.data;

    const auth = await authorizeOwner(schoolId);
    if (!auth.ok) return { success: false, message: auth.message };

    // أدوار مدرسية صالحة فقط — يضمن عدم استهداف system_owner (وهو أصلاً ليس في user_personas).
    const validRoles = roles.filter(isAssignableQaRole);
    if (validRoles.length === 0) {
        return { success: false, message: 'لم يتم اختيار أدوار قابلة للإزالة.' };
    }

    const { error: deleteError } = await supabaseAdmin
        .from('user_personas')
        .delete()
        .eq('user_id', auth.userId) // النفس فقط
        .eq('school_id', schoolId) // المدرسة الحالية فقط
        .in('role', validRoles); // أدوار مدرسية مختارة فقط

    if (deleteError) {
        console.error('[removeTestRolesFromSelf] delete error:', deleteError);
        return { success: false, message: 'تعذّر إزالة أدوار الاختبار.' };
    }

    await writeAudit('qa_remove_test_roles', auth.userId, auth.role, schoolId, validRoles);

    revalidatePath(`/school/${schoolId}/staff`);
    revalidatePath('/portal');

    return {
        success: true,
        message: `تمت إزالة ${validRoles.length} دور اختبار من حسابك.`,
        affectedRoles: validRoles,
    };
}

// تدقيق غير حاجز: action_audit_log موجود (school_id NOT NULL محقّق من schoolId المسار).
async function writeAudit(
    action: string,
    userId: string,
    role: string,
    schoolId: string,
    roles: UserRole[],
): Promise<void> {
    try {
        await supabaseAdmin.from('action_audit_log').insert({
            action_name: `${action}:user_personas`,
            user_id: userId,
            role,
            school_id: schoolId,
            status: 'success',
            metadata: { roles },
        });
    } catch (auditError) {
        console.error('[qa-roles] audit insert failed (non-fatal):', auditError);
    }
}
