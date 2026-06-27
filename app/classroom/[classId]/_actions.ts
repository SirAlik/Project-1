'use server';
// ════════════════════════════════════════════════════════════════════════════
// Sprint 8 — توزيع المنهج (Teacher-authored Curriculum Distribution)
// ════════════════════════════════════════════════════════════════════════════
// المعلّم المُسنَد (الإدارة تُسند المادة/الفصل) هو من يؤلّف ويدير توزيع المنهج:
// وحدات/دروس/تواريخ مخطّطة/ترتيب/حالة/ملاحظات. الإدارة تتابع الإنجاز فقط (قراءة).
//
// العزل: school_id خادمي من getActivePersona() — لا من العميل. كل تأليف يتطلّب
// دور teacher + تكليف (فصل+مادة) من teacher_assignments. النسبة من إنجاز فعلي
// (status='completed') لا قيمة مُختلَقة. رسائل عربية آمنة + console.error.

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

const LOAD_FAILED = 'تعذّر تحميل توزيع المنهج، يرجى المحاولة لاحقاً';
const SAVE_FAILED = 'تعذّر حفظ توزيع المنهج، يرجى المحاولة لاحقاً';
const NOT_TEACHER = 'توزيع المنهج يديره المعلّم المُسنَد للمادة في هذا الفصل';
const NOT_ASSIGNED = 'هذا الفصل/المادة غير مُسنَد إليك';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';
const VALID_STATUS: LessonStatus[] = ['not_started', 'in_progress', 'completed'];

export type CurriculumLessonView = {
    id: string;
    title: string;
    plannedDate: string | null;
    estimatedPeriods: number;
    notes: string | null;
    status: LessonStatus;
};
export type CurriculumUnitView = {
    id: string;
    title: string;
    lessons: CurriculumLessonView[];
};
export type SubjectCurriculumView = {
    subjectId: string;
    subjectName: string;
    totalLessons: number;
    completedLessons: number;
    units: CurriculumUnitView[];
};
export type ClassCurriculumView = {
    subjects: SubjectCurriculumView[];
};

// ─── حُرّاس داخلية (دفاع عميق فوق RLS) ────────────────────────────────────────

type SB = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// المعلّم مُسنَد لـ (الفصل + المادة)؟
async function teacherOwnsClassSubject(
    supabase: SB, schoolId: string, userId: string, classId: string, subjectId: string,
): Promise<boolean> {
    const { data } = await supabase
        .from('teacher_assignments').select('id')
        .eq('class_id', classId).eq('subject_id', subjectId)
        .eq('teacher_id', userId).eq('school_id', schoolId)
        .limit(1).maybeSingle();
    return !!data;
}

// تُرجع الوحدة إن كانت ضمن المدرسة + الفصل المُمرَّر + المعلّم مُسنَد لمادتها، وإلا null.
async function loadOwnedUnit(
    supabase: SB, schoolId: string, userId: string, unitId: string, classId: string,
): Promise<{ id: string; class_id: string; subject_id: string } | null> {
    const { data: unit } = await supabase
        .from('curriculum_units')
        .select('id, class_id, subject_id')
        .eq('id', unitId).eq('school_id', schoolId).eq('class_id', classId)
        .maybeSingle();
    if (!unit) return null;
    const owned = await teacherOwnsClassSubject(
        supabase, schoolId, userId, unit.class_id as string, unit.subject_id as string);
    return owned ? (unit as { id: string; class_id: string; subject_id: string }) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) getClassCurriculumAction — توزيع المنهج + حالة الإنجاز لكل مادة مُسنَدة
// ─────────────────────────────────────────────────────────────────────────────
export async function getClassCurriculumAction(
    classId: string,
): Promise<ARData<ClassCurriculumView>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (!classId) return { ok: false, error: 'الفصل غير محدد' };

    const supabase = await createSupabaseServerClient();

    const { data: cls, error: clsErr } = await supabase
        .from('classes').select('id')
        .eq('id', classId).eq('school_id', persona.schoolId).maybeSingle();
    if (clsErr) { console.error('[curriculum] getClass:', clsErr.message); return { ok: false, error: LOAD_FAILED }; }
    if (!cls) return { ok: false, error: 'الفصل لا ينتمي لهذه المدرسة' };

    // المواد المُسنَدة للمُستدعي في هذا الفصل (مصدر السلطة = teacher_assignments)
    const { data: assigns, error: asgErr } = await supabase
        .from('teacher_assignments').select('subject_id')
        .eq('class_id', classId).eq('teacher_id', persona.userId).eq('school_id', persona.schoolId);
    if (asgErr) { console.error('[curriculum] getAssignments:', asgErr.message); return { ok: false, error: LOAD_FAILED }; }

    const subjectIds = [...new Set((assigns ?? []).map(a => a.subject_id as string))];
    if (subjectIds.length === 0) return { ok: true, data: { subjects: [] } };

    const { data: subjects, error: subErr } = await supabase
        .from('subjects').select('id, name_ar')
        .eq('school_id', persona.schoolId).in('id', subjectIds);
    if (subErr) { console.error('[curriculum] getSubjects:', subErr.message); return { ok: false, error: LOAD_FAILED }; }

    // وحدات الفصل لهذه المواد (يؤلّفها المعلّم)
    const { data: units, error: unitErr } = await supabase
        .from('curriculum_units')
        .select('id, subject_id, title, sort_order')
        .eq('school_id', persona.schoolId).eq('class_id', classId)
        .in('subject_id', subjectIds).eq('is_active', true)
        .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (unitErr) { console.error('[curriculum] getUnits:', unitErr.message); return { ok: false, error: LOAD_FAILED }; }

    const unitIds = (units ?? []).map(u => u.id as string);

    type LessonRow = {
        id: string; unit_id: string; title: string; planned_date: string | null;
        estimated_periods: number; notes: string | null; status: LessonStatus; sort_order: number;
    };
    let lessons: LessonRow[] = [];
    if (unitIds.length > 0) {
        const { data: lessonRows, error: lesErr } = await supabase
            .from('curriculum_lessons')
            .select('id, unit_id, title, planned_date, estimated_periods, notes, status, sort_order')
            .eq('school_id', persona.schoolId).in('unit_id', unitIds).eq('is_active', true)
            .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
        if (lesErr) { console.error('[curriculum] getLessons:', lesErr.message); return { ok: false, error: LOAD_FAILED }; }
        lessons = (lessonRows ?? []) as unknown as LessonRow[];
    }

    const lessonsByUnit = new Map<string, LessonRow[]>();
    lessons.forEach(l => {
        const arr = lessonsByUnit.get(l.unit_id) ?? [];
        arr.push(l);
        lessonsByUnit.set(l.unit_id, arr);
    });

    type UnitRow = { id: string; subject_id: string; title: string };
    const unitsBySubject = new Map<string, UnitRow[]>();
    ((units ?? []) as unknown as UnitRow[]).forEach(u => {
        const arr = unitsBySubject.get(u.subject_id) ?? [];
        arr.push(u);
        unitsBySubject.set(u.subject_id, arr);
    });

    const nameMap = Object.fromEntries((subjects ?? []).map(s => [s.id as string, s.name_ar as string]));

    const subjectViews: SubjectCurriculumView[] = subjectIds.map(sid => {
        const sUnits = unitsBySubject.get(sid) ?? [];
        let total = 0, completed = 0;
        const unitViews: CurriculumUnitView[] = sUnits.map(u => {
            const uLessons = lessonsByUnit.get(u.id) ?? [];
            const lessonViews: CurriculumLessonView[] = uLessons.map(l => {
                total += 1;
                if (l.status === 'completed') completed += 1;
                return {
                    id: l.id, title: l.title, plannedDate: l.planned_date,
                    estimatedPeriods: l.estimated_periods, notes: l.notes, status: l.status,
                };
            });
            return { id: u.id, title: u.title, lessons: lessonViews };
        });
        return {
            subjectId: sid, subjectName: nameMap[sid] ?? 'مادة',
            totalLessons: total, completedLessons: completed, units: unitViews,
        };
    });

    return { ok: true, data: { subjects: subjectViews } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) addCurriculumUnitAction — المعلّم يضيف وحدة
// ─────────────────────────────────────────────────────────────────────────────
export async function addCurriculumUnitAction(input: {
    classId: string; subjectId: string; title: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    const title = (input.title ?? '').trim();
    if (!input.classId || !input.subjectId) return { ok: false, error: 'بيانات غير مكتملة' };
    if (!title) return { ok: false, error: 'عنوان الوحدة مطلوب' };

    const supabase = await createSupabaseServerClient();
    if (!(await teacherOwnsClassSubject(supabase, persona.schoolId, persona.userId, input.classId, input.subjectId))) {
        return { ok: false, error: NOT_ASSIGNED };
    }

    const { count } = await supabase
        .from('curriculum_units').select('id', { count: 'exact', head: true })
        .eq('class_id', input.classId).eq('subject_id', input.subjectId);

    const { error } = await supabase.from('curriculum_units').insert({
        school_id: persona.schoolId, class_id: input.classId, subject_id: input.subjectId,
        title, sort_order: count ?? 0, created_by: persona.userId,
    });
    if (error) { console.error('[curriculum] addUnit:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) addCurriculumLessonAction — المعلّم يضيف درسًا تحت وحدة
// ─────────────────────────────────────────────────────────────────────────────
export async function addCurriculumLessonAction(input: {
    classId: string; unitId: string; title: string;
    plannedDate?: string | null; estimatedPeriods?: number; notes?: string | null;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    const title = (input.title ?? '').trim();
    if (!input.classId || !input.unitId) return { ok: false, error: 'بيانات غير مكتملة' };
    if (!title) return { ok: false, error: 'عنوان الدرس مطلوب' };

    const supabase = await createSupabaseServerClient();
    const unit = await loadOwnedUnit(supabase, persona.schoolId, persona.userId, input.unitId, input.classId);
    if (!unit) return { ok: false, error: NOT_ASSIGNED };

    const { count } = await supabase
        .from('curriculum_lessons').select('id', { count: 'exact', head: true })
        .eq('unit_id', input.unitId);

    const periods = typeof input.estimatedPeriods === 'number' && input.estimatedPeriods > 0
        ? input.estimatedPeriods : 1;
    const { error } = await supabase.from('curriculum_lessons').insert({
        school_id: persona.schoolId, unit_id: input.unitId, title,
        planned_date: input.plannedDate || null, sort_order: count ?? 0,
        estimated_periods: periods, notes: input.notes?.trim() || null,
        created_by: persona.userId,
    });
    if (error) { console.error('[curriculum] addLesson:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) updateCurriculumLessonAction — تحرير عنوان/تاريخ/ملاحظات/حصص الدرس
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCurriculumLessonAction(input: {
    classId: string; lessonId: string;
    title?: string; plannedDate?: string | null; notes?: string | null; estimatedPeriods?: number;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    if (!input.classId || !input.lessonId) return { ok: false, error: 'بيانات غير مكتملة' };

    const supabase = await createSupabaseServerClient();
    const ownedUnitId = await lessonOwnedUnitId(supabase, persona.schoolId, persona.userId, input.lessonId, input.classId);
    if (!ownedUnitId) return { ok: false, error: NOT_ASSIGNED };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) {
        const t = input.title.trim();
        if (!t) return { ok: false, error: 'عنوان الدرس مطلوب' };
        patch.title = t;
    }
    if (input.plannedDate !== undefined) patch.planned_date = input.plannedDate || null;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
    if (input.estimatedPeriods !== undefined && input.estimatedPeriods > 0) patch.estimated_periods = input.estimatedPeriods;

    const { error } = await supabase.from('curriculum_lessons')
        .update(patch).eq('id', input.lessonId).eq('school_id', persona.schoolId);
    if (error) { console.error('[curriculum] updateLesson:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) setLessonStatusAction — تحديث حالة الدرس (يغذّي شريط التقدّم الحقيقي)
// ─────────────────────────────────────────────────────────────────────────────
export async function setLessonStatusAction(input: {
    classId: string; lessonId: string; status: LessonStatus;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    if (!input.classId || !input.lessonId) return { ok: false, error: 'بيانات غير مكتملة' };
    if (!VALID_STATUS.includes(input.status)) return { ok: false, error: 'حالة الدرس غير صالحة' };

    const supabase = await createSupabaseServerClient();
    const ownedUnitId = await lessonOwnedUnitId(supabase, persona.schoolId, persona.userId, input.lessonId, input.classId);
    if (!ownedUnitId) return { ok: false, error: NOT_ASSIGNED };

    const now = new Date().toISOString();
    const { error } = await supabase.from('curriculum_lessons').update({
        status: input.status,
        completed_at: input.status === 'completed' ? now : null,
        updated_at: now,
    }).eq('id', input.lessonId).eq('school_id', persona.schoolId);
    if (error) { console.error('[curriculum] setStatus:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) deleteCurriculumLessonAction — حذف درس (ورقة، آمن)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteCurriculumLessonAction(input: {
    classId: string; lessonId: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    if (!input.classId || !input.lessonId) return { ok: false, error: 'بيانات غير مكتملة' };

    const supabase = await createSupabaseServerClient();
    const ownedUnitId = await lessonOwnedUnitId(supabase, persona.schoolId, persona.userId, input.lessonId, input.classId);
    if (!ownedUnitId) return { ok: false, error: NOT_ASSIGNED };

    const { error } = await supabase.from('curriculum_lessons')
        .delete().eq('id', input.lessonId).eq('school_id', persona.schoolId);
    if (error) { console.error('[curriculum] deleteLesson:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) deleteCurriculumUnitAction — حذف وحدة فارغة، أو تعطيلها إن كانت تحوي دروسًا
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteCurriculumUnitAction(input: {
    classId: string; unitId: string;
}): Promise<ARData<{ mode: 'deleted' | 'disabled' }>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (persona.role !== 'teacher') return { ok: false, error: NOT_TEACHER };
    if (!input.classId || !input.unitId) return { ok: false, error: 'بيانات غير مكتملة' };

    const supabase = await createSupabaseServerClient();
    const unit = await loadOwnedUnit(supabase, persona.schoolId, persona.userId, input.unitId, input.classId);
    if (!unit) return { ok: false, error: NOT_ASSIGNED };

    const { count } = await supabase
        .from('curriculum_lessons').select('id', { count: 'exact', head: true })
        .eq('unit_id', input.unitId).eq('is_active', true);

    // وحدة بها دروس → تعطيل آمن (لا حذف يفقد سجلّ الدروس)؛ وحدة فارغة → حذف نهائي
    if ((count ?? 0) > 0) {
        const { error } = await supabase.from('curriculum_units')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', input.unitId).eq('school_id', persona.schoolId);
        if (error) { console.error('[curriculum] disableUnit:', error.message); return { ok: false, error: SAVE_FAILED }; }
        return { ok: true, data: { mode: 'disabled' } };
    }

    const { error } = await supabase.from('curriculum_units')
        .delete().eq('id', input.unitId).eq('school_id', persona.schoolId);
    if (error) { console.error('[curriculum] deleteUnit:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true, data: { mode: 'deleted' } };
}

// ─── مساعد: يُرجع unit_id إن كان الدرس ضمن المدرسة + الفصل + يملكه المعلّم ─────
async function lessonOwnedUnitId(
    supabase: SB, schoolId: string, userId: string, lessonId: string, classId: string,
): Promise<string | null> {
    const { data: lesson } = await supabase
        .from('curriculum_lessons')
        .select('id, unit_id, curriculum_units!inner(id, class_id, subject_id, school_id)')
        .eq('id', lessonId).eq('school_id', schoolId).maybeSingle();
    if (!lesson) return null;
    const unit = (lesson as unknown as {
        unit_id: string; curriculum_units: { class_id: string; subject_id: string };
    });
    if (unit.curriculum_units.class_id !== classId) return null;
    const owned = await teacherOwnsClassSubject(
        supabase, schoolId, userId, unit.curriculum_units.class_id, unit.curriculum_units.subject_id);
    return owned ? unit.unit_id : null;
}
