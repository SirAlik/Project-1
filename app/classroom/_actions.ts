'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { mapToDbEventType } from '@/lib/types/classroom';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

type EventPayloadItem = {
    student_id: string;
    student_name_cached?: string;
    type: string;
    note?: string | null;
    actor_role_cached?: string;
    action_category?: string;
    points_delta?: number;
    event_date: string;
    class_id?: string;
};

// رسالة عربية آمنة موحّدة؛ التفاصيل التقنية تبقى في سجلّ الخادم فقط (لا تسريب schema/قيود للمستخدم).
const WRITE_FAILED = 'تعذّر حفظ البيانات، يرجى المحاولة لاحقاً';
const UNSUPPORTED_EVENT = 'هذا النوع من الأحداث غير مدعوم حالياً في السجل الرسمي';
const CLASS_NOT_LINKED = 'لا يمكن حفظ هذا الإجراء لأن الفصل غير مرتبط بسجل قاعدة البيانات.';

// يتحقق أن الفصل يتبع مدرسة المُستدعي (دفاع عميق فوق RLS؛ classId يأتي من المسار/العميل).
async function classBelongsToSchool(
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    classId: string,
    schoolId: string,
): Promise<boolean> {
    const { data } = await supabase
        .from('classes').select('id')
        .eq('id', classId).eq('school_id', schoolId).maybeSingle();
    return !!data;
}

// يحوّل صف الحدث إلى صف قابل للإدراج (type صالح في enum)، أو null إذا كان النوع غير قابل للتمثيل.
function buildEventRow(p: EventPayloadItem): Record<string, unknown> | null {
    const dbType = mapToDbEventType(p.type);
    if (!dbType) return null; // مكافأة/نجمة/وسام/خروج غير قابل للتمثيل → رفض صادق لا قيمة مختلَقة

    // حفظ النوع الأصلي عند اختلافه عن قيمة الـenum (مثل تجميع المخالفات في "مخالفة").
    const note = dbType !== p.type
        ? [p.note, `النوع: ${p.type}`].filter(Boolean).join(' — ')
        : (p.note ?? null);

    return {
        student_id: p.student_id,
        student_name_cached: p.student_name_cached,
        type: dbType,
        note,
        action_category: p.action_category,
        points_delta: p.points_delta,
        event_date: p.event_date,
        class_id: p.class_id,
        metadata: { app_type: p.type },
    };
}

export async function saveAttendanceAction(
    absentOrLate: { studentId: string; studentName?: string; status: 'absent' | 'late'; note?: string }[],
    classId?: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    if (absentOrLate.length === 0) return { ok: true };

    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];
    const payload = absentOrLate.map(r => ({
        student_id: r.studentId,
        student_name_cached: r.studentName,
        // قيم enum الصحيحة: غياب/تأخر (كانت "غائب"/"متأخر" مرفوضة من القاعدة).
        type: r.status === 'absent' ? 'غياب' : 'تأخر',
        actor_role_cached: persona.role,
        created_by: persona.userId,
        note: r.note ?? null,
        event_date: today,
        class_id: classId,
        school_id: persona.schoolId,
    }));

    const { error } = await supabase.from('events').insert(payload);
    if (error) { console.error('[classroom] saveAttendance:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

export async function addEventAction(
    payload: EventPayloadItem[],
): Promise<ARData<{ ids: string[] }>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const built = payload.map(buildEventRow);
    if (built.some(r => r === null)) {
        return { ok: false, error: UNSUPPORTED_EVENT };
    }

    const supabase = await createSupabaseServerClient();
    const rows = built.map(r => ({
        ...(r as Record<string, unknown>),
        created_by: persona.userId,
        actor_role_cached: persona.role,
        school_id: persona.schoolId,
    }));

    const { data, error } = await supabase.from('events').insert(rows).select('id');
    if (error) { console.error('[classroom] addEvent:', error.message); return { ok: false, error: WRITE_FAILED }; }

    const ids = (data as { id: string }[]).map(d => d.id);
    return { ok: true, data: { ids } };
}

export async function undoEventsAction(ids: string[]): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('events').delete().in('id', ids);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) { console.error('[classroom] undoEvents:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

// نجوم الحصة مكافأة لا تُمثَّل في enum event_type الحالي ولا يوجد جدول مكافآت صفّي.
// رفض صادق بدل كتابة قيمة enum خاطئة أو ادّعاء نجاح. تفعيلها يتطلب migration (انظر
// db/migrations/20260628_classroom_event_types_expansion.sql — غير مُطبَّق).
export async function saveStarsAction(
    _stars: { studentId: string; studentName: string }[],
    _classId?: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    return { ok: false, error: 'تسجيل نجوم الحصة غير مفعّل بعد في السجل الرسمي' };
}

export async function saveParentNoteAction(
    studentId: string,
    content: string,
    urgency: 'low' | 'medium' | 'high',
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('parent_notes').insert([{
        student_id: studentId,
        teacher_id: persona.userId,
        content,
        urgency,
        school_id: persona.schoolId,
        created_at: new Date().toISOString(),
    }]);

    if (error) { console.error('[classroom] saveParentNote:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

export async function saveSeatingMapAction(
    classId: string | undefined,
    seatingMap: Record<string, { x: number; y: number }>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    // classroom_metadata.class_id فريد ومطلوب فعلياً — بدونه نكتب صفوف class_id=NULL متكررة.
    if (!classId || classId.trim() === '') return { ok: false, error: CLASS_NOT_LINKED };

    const supabase = await createSupabaseServerClient();
    if (!(await classBelongsToSchool(supabase, classId, persona.schoolId))) {
        return { ok: false, error: CLASS_NOT_LINKED };
    }

    const { error } = await supabase.from('classroom_metadata').upsert({
        class_id: classId,
        seating_map: seatingMap,
        school_id: persona.schoolId,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'class_id' });

    if (error) { console.error('[classroom] saveSeatingMap:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

export async function saveStudentRolesAction(
    classId: string | undefined,
    studentRoles: Record<string, string>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (!classId || classId.trim() === '') return { ok: false, error: CLASS_NOT_LINKED };

    const supabase = await createSupabaseServerClient();
    if (!(await classBelongsToSchool(supabase, classId, persona.schoolId))) {
        return { ok: false, error: CLASS_NOT_LINKED };
    }

    const { error } = await supabase.from('classroom_metadata').upsert({
        class_id: classId,
        student_roles: studentRoles,
        school_id: persona.schoolId,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'class_id' });

    if (error) { console.error('[classroom] saveStudentRoles:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

export async function syncOfflineQueueAction(
    events: EventPayloadItem[],
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const built = events.map(buildEventRow);
    if (built.some(r => r === null)) {
        return { ok: false, error: UNSUPPORTED_EVENT };
    }

    const supabase = await createSupabaseServerClient();
    const rows = built.map(r => ({
        ...(r as Record<string, unknown>),
        created_by: persona.userId,
        actor_role_cached: persona.role,
        school_id: persona.schoolId,
    }));

    const { error } = await supabase.from('events').insert(rows);
    if (error) { console.error('[classroom] syncOfflineQueue:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}

// ─── خروج/عودة الطالب من الحصة (classroom_exits) ──────────────────────────────
// المصدر الصحيح للخروج الصفّي: جدول classroom_exits (exit_type نصّي حرّ — يدعم
// "دورة مياه"/"عيادة"/"أخرى") مع تتبّع العودة (return_time/duration_minutes).
// لا يُكتب في enum event_type (خروج دورة المياه غير مُمثَّل فيه).

export async function startClassExitAction(input: {
    classId: string;
    studentId: string;
    exitType: string;
}): Promise<ARData<{ id: string }>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (!input.classId || input.classId.trim() === '') return { ok: false, error: CLASS_NOT_LINKED };

    const supabase = await createSupabaseServerClient();
    if (!(await classBelongsToSchool(supabase, input.classId, persona.schoolId))) {
        return { ok: false, error: CLASS_NOT_LINKED };
    }
    // عزل المستأجر: الطالب يجب أن يتبع مدرسة المُستدعي
    const { data: stu } = await supabase
        .from('student_profiles').select('id')
        .eq('id', input.studentId).eq('school_id', persona.schoolId).maybeSingle();
    if (!stu) return { ok: false, error: 'الطالب لا ينتمي لهذه المدرسة' };

    const now = new Date();
    const { data, error } = await supabase.from('classroom_exits').insert({
        school_id: persona.schoolId,
        student_id: input.studentId,
        class_id: input.classId,
        exit_type: input.exitType,
        exit_date: now.toISOString().split('T')[0],
        exit_time: now.toISOString(),
    }).select('id').single();

    if (error) { console.error('[classroom] startExit:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true, data: { id: (data as { id: string }).id } };
}

export async function endClassExitAction(exitId: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    // نقرأ وقت الخروج (مُقيَّداً بالمدرسة) لحساب المدّة الفعلية — لا قيمة مُختلَقة
    const { data: exitRow } = await supabase
        .from('classroom_exits').select('exit_time')
        .eq('id', exitId).eq('school_id', persona.schoolId).maybeSingle();
    if (!exitRow) return { ok: false, error: WRITE_FAILED };

    const now = new Date();
    const startMs = new Date(exitRow.exit_time as string).getTime();
    const duration = Math.max(0, Math.round((now.getTime() - startMs) / 60000));

    const { error } = await supabase.from('classroom_exits')
        .update({ return_time: now.toISOString(), duration_minutes: duration })
        .eq('id', exitId)
        .eq('school_id', persona.schoolId);

    if (error) { console.error('[classroom] endExit:', error.message); return { ok: false, error: WRITE_FAILED }; }
    return { ok: true };
}
