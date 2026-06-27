'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

// إجراءات الموجه الطلابي الخادمية — كل كتابة حساسة (cases · parent_reports · case_actions ·
// counseling_sessions) تمر من هنا: school_id والدور وهوية الفاعل تُشتق server-side من getActivePersona
// (لا من العميل). رسائل عربية آمنة للمستخدم؛ التفاصيل التقنية تبقى في سجلّ الخادم فقط.

type ActionResult = { ok: boolean; error?: string; caseId?: string };

const UNAUTHORIZED = 'غير مصرح بهذا الإجراء';
const GENERIC = 'تعذّر إكمال العملية، يرجى المحاولة لاحقاً';

// قيم مطابقة لـ enums قاعدة البيانات (public.case_category / public.session_type).
// أي قيمة خارج المجموعة تُحوَّل إلى قيمة صالحة افتراضية بدل أن يفشل الإدخال.
const VALID_CASE_CATEGORIES = ['سلوكي', 'غياب/تأخر', 'أكاديمي', 'نفسي', 'اجتماعي', 'صحي', 'أخرى'];
const VALID_SESSION_TYPES = ['وقائية', 'علاجية', 'متابعة', 'أزمة', 'توجيه جمعي'];

function safeCategory(value?: string | null): string {
    const v = (value ?? '').trim();
    return VALID_CASE_CATEGORIES.includes(v) ? v : 'أخرى';
}

function safeSessionType(value?: string | null): string {
    const v = (value ?? '').trim();
    return VALID_SESSION_TYPES.includes(v) ? v : 'وقائية';
}

// حارس مركزي: الموجه الطلابي فقط + سياق مدرسة موثوق من الخادم (fail-closed).
async function requireCounselor() {
    const persona = await getActivePersona();
    if (!persona || !persona.schoolId) return null;
    if (persona.role !== 'student_counselor') return null;
    return persona;
}

/** فتح بلاغ ولي أمر كمعاملة + ربط البلاغ + تسجيل إجراء. */
export async function openReportAsCaseAction(input: {
    reportId: string;
    studentId: string | null;
    classId: string | null;
    title: string | null;
}): Promise<ActionResult> {
    const persona = await requireCounselor();
    if (!persona) return { ok: false, error: UNAUTHORIZED };

    const supabase = await createSupabaseServerClient();
    try {
        const title = (input.title ?? '').trim() || 'بلاغ ولي أمر';

        const { data: newCase, error: caseErr } = await supabase
            .from('cases')
            .insert([{
                title,
                category: 'أخرى',
                status: 'مفتوحة',
                student_id: input.studentId,
                class_id: input.classId,
                opened_by_name: persona.displayName ?? null,
                opened_by_role: persona.role,
                assigned_to_role: persona.role,
                school_id: persona.schoolId,
            }])
            .select('id')
            .single();
        if (caseErr || !newCase) throw caseErr ?? new Error('case insert returned no row');

        const { error: repErr } = await supabase
            .from('parent_reports')
            .update({ status: 'مفتوح', case_id: newCase.id })
            .eq('id', input.reportId)
            .eq('school_id', persona.schoolId);
        if (repErr) throw repErr;

        const { error: actErr } = await supabase.from('case_actions').insert([{
            case_id: newCase.id,
            action_type: 'فتح بلاغ ولي أمر',
            note: 'تم فتح البلاغ وتحويله إلى معاملة لدى الموجه الطلابي',
            actor_id: persona.userId,
            school_id: persona.schoolId,
        }]);
        if (actErr) throw actErr;

        return { ok: true, caseId: newCase.id };
    } catch (e) {
        console.error('[counselor] openReportAsCaseAction failed:', e);
        return { ok: false, error: GENERIC };
    }
}

/** اعتماد طلب صحي/اجتماعي من ولي الأمر كمعاملة (يحفظ details الأصلية). */
export async function approveHealthSocialAction(input: {
    reportId: string;
    studentId: string | null;
    classId: string | null;
    title: string | null;
    category: string | null;
    details: string | null;
}): Promise<ActionResult> {
    const persona = await requireCounselor();
    if (!persona) return { ok: false, error: UNAUTHORIZED };

    const supabase = await createSupabaseServerClient();
    try {
        const { data: newCase, error: caseErr } = await supabase
            .from('cases')
            .insert([{
                title: (input.title ?? '').trim() || 'تحديث حالة صحية/اجتماعية',
                category: safeCategory(input.category),
                status: 'مفتوحة',
                details: input.details,
                student_id: input.studentId,
                class_id: input.classId,
                opened_by_name: persona.displayName ?? null,
                opened_by_role: persona.role,
                assigned_to_role: persona.role,
                school_id: persona.schoolId,
            }])
            .select('id')
            .single();
        if (caseErr || !newCase) throw caseErr ?? new Error('case insert returned no row');

        const { error: repErr } = await supabase
            .from('parent_reports')
            .update({ status: 'approved', case_id: newCase.id })
            .eq('id', input.reportId)
            .eq('school_id', persona.schoolId);
        if (repErr) throw repErr;

        const { error: actErr } = await supabase.from('case_actions').insert([{
            case_id: newCase.id,
            action_type: 'اعتماد حالة',
            note: 'تم اعتماد تحديث البيانات الصحية/الاجتماعية المقدّم من ولي الأمر',
            actor_id: persona.userId,
            school_id: persona.schoolId,
        }]);
        if (actErr) throw actErr;

        return { ok: true, caseId: newCase.id };
    } catch (e) {
        console.error('[counselor] approveHealthSocialAction failed:', e);
        return { ok: false, error: GENERIC };
    }
}

/** إنشاء معاملة يدوية (زيارة/حالة بدون بلاغ). */
export async function createCaseManualAction(input: {
    title: string;
    category: string | null;
    studentId: string | null;
    classId: string | null;
}): Promise<ActionResult> {
    const persona = await requireCounselor();
    if (!persona) return { ok: false, error: UNAUTHORIZED };

    const title = (input.title ?? '').trim();
    if (!title) return { ok: false, error: 'يرجى كتابة عنوان المعاملة' };

    const supabase = await createSupabaseServerClient();
    try {
        const { data: created, error } = await supabase
            .from('cases')
            .insert([{
                title,
                category: safeCategory(input.category),
                status: 'مفتوحة',
                student_id: input.studentId,
                class_id: input.classId,
                opened_by_name: persona.displayName ?? null,
                opened_by_role: persona.role,
                assigned_to_role: persona.role,
                school_id: persona.schoolId,
            }])
            .select('id')
            .single();
        if (error || !created) throw error ?? new Error('case insert returned no row');

        const { error: actErr } = await supabase.from('case_actions').insert([{
            case_id: created.id,
            action_type: 'فتح معاملة',
            note: 'تم فتح معاملة جديدة بواسطة الموجه الطلابي',
            actor_id: persona.userId,
            school_id: persona.schoolId,
        }]);
        if (actErr) throw actErr;

        return { ok: true, caseId: created.id };
    } catch (e) {
        console.error('[counselor] createCaseManualAction failed:', e);
        return { ok: false, error: GENERIC };
    }
}

/** تسجيل جلسة إرشادية. */
export async function addSessionAction(input: {
    studentId: string;
    classId: string | null;
    type: string;
    topic: string;
    notes: string;
    actions: string;
    followUpRequired: boolean;
    followUpDate: string | null;
}): Promise<ActionResult> {
    const persona = await requireCounselor();
    if (!persona) return { ok: false, error: UNAUTHORIZED };

    if (!input.studentId) return { ok: false, error: 'يرجى اختيار الطالب للجلسة' };
    const topic = (input.topic ?? '').trim();
    if (!topic) return { ok: false, error: 'يرجى كتابة موضوع مختصر للجلسة' };

    const supabase = await createSupabaseServerClient();
    try {
        const { error } = await supabase.from('counseling_sessions').insert([{
            student_id: input.studentId,
            class_id: input.classId || null,
            session_date: new Date().toISOString().split('T')[0],
            session_type: safeSessionType(input.type),
            topic,
            notes: (input.notes ?? '').trim() || null,
            actions_taken: (input.actions ?? '').trim() || null,
            follow_up_required: input.followUpRequired,
            follow_up_date: (input.followUpRequired && input.followUpDate) ? input.followUpDate : null,
            counselor_nar: persona.displayName ?? null,
            counselor_rol: persona.role,
            school_id: persona.schoolId,
        }]);
        if (error) throw error;

        return { ok: true };
    } catch (e) {
        console.error('[counselor] addSessionAction failed:', e);
        return { ok: false, error: GENERIC };
    }
}
