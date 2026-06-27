'use server';
// ════════════════════════════════════════════════════════════════════════════
// Sprint 7 — إجراءات تقدّم المنهج (Curriculum Progress)
// ════════════════════════════════════════════════════════════════════════════
// تحميل منهج الفصل (وحدات/دروس) + حالة الإنجاز، وتحديث حالة الدرس. النسبة تُحسب
// في العميل من عدّ الدروس المكتملة فعلياً — لا قيمة مخزَّنة يدوياً ولا نسبة مُختلَقة.
//
// العزل وعزل المستأجر:
//   • school_id يُشتقّ خادمياً من getActivePersona() — لا من العميل.
//   • الفصل يجب أن يتبع مدرسة المُستدعي. الدرس يجب أن يتبع نفس المدرسة.
//   • المعلّم يُحدّث فقط الفصول/المواد المُسنَدة إليه (teacher_assignments) —
//     دفاع عميق فوق RLS (سياسات ccp_* + الدالة is_assigned_class_teacher).
//   • رسائل عربية آمنة؛ التفاصيل التقنية في console.error فقط.

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

const LOAD_FAILED = 'تعذّر تحميل خطة المنهج، يرجى المحاولة لاحقاً';
const SAVE_FAILED = 'تعذّر تحديث حالة الدرس، يرجى المحاولة لاحقاً';

export type LessonStatus = 'not_started' | 'in_progress' | 'completed';
const VALID_STATUS: LessonStatus[] = ['not_started', 'in_progress', 'completed'];

// الأدوار المسموح لها بتحديث تقدّم المنهج (المعلّم + إدارة/إشراف المدرسة).
const CURRICULUM_OPERATORS = ['teacher', 'school_admin', 'school_principal', 'academic_vp'];

export type CurriculumLessonView = {
    id: string;
    title: string;
    estimatedPeriods: number;
    status: LessonStatus;
};
export type CurriculumUnitView = {
    id: string;
    title: string;
    description: string | null;
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
    gradeLevel: number | null;
    subjects: SubjectCurriculumView[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 1) getClassCurriculumAction — منهج الفصل + حالة الإنجاز
// ─────────────────────────────────────────────────────────────────────────────
export async function getClassCurriculumAction(
    classId: string,
): Promise<ARData<ClassCurriculumView>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (!classId) return { ok: false, error: 'الفصل غير محدد' };

    const supabase = await createSupabaseServerClient();

    // الفصل ضمن مدرسة المُستدعي + صفّه الدراسي
    const { data: cls, error: clsErr } = await supabase
        .from('classes')
        .select('id, grade_level')
        .eq('id', classId)
        .eq('school_id', persona.schoolId)
        .maybeSingle();
    if (clsErr) { console.error('[curriculum] getClass:', clsErr.message); return { ok: false, error: LOAD_FAILED }; }
    if (!cls) return { ok: false, error: 'الفصل لا ينتمي لهذه المدرسة' };

    const gradeLevel = (cls.grade_level as number | null) ?? null;
    // بلا صفّ دراسي → لا منهج مرتبط (حالة فارغة صادقة، لا نسبة وهمية)
    if (gradeLevel === null) return { ok: true, data: { gradeLevel: null, subjects: [] } };

    // المواد التي يُدرّسها المُستدعي في هذا الفصل (teacher_assignments)
    const { data: assigns, error: asgErr } = await supabase
        .from('teacher_assignments')
        .select('subject_id')
        .eq('class_id', classId)
        .eq('teacher_id', persona.userId)
        .eq('school_id', persona.schoolId);
    if (asgErr) { console.error('[curriculum] getAssignments:', asgErr.message); return { ok: false, error: LOAD_FAILED }; }

    const subjectIds = [...new Set((assigns ?? []).map(a => a.subject_id as string))];
    if (subjectIds.length === 0) return { ok: true, data: { gradeLevel, subjects: [] } };

    // أسماء المواد
    const { data: subjects, error: subErr } = await supabase
        .from('subjects')
        .select('id, name_ar')
        .eq('school_id', persona.schoolId)
        .in('id', subjectIds);
    if (subErr) { console.error('[curriculum] getSubjects:', subErr.message); return { ok: false, error: LOAD_FAILED }; }

    // وحدات المنهج لهذه المواد عند صفّ الفصل
    const { data: units, error: unitErr } = await supabase
        .from('curriculum_units')
        .select('id, subject_id, title, description, sort_order')
        .eq('school_id', persona.schoolId)
        .eq('grade_level', gradeLevel)
        .in('subject_id', subjectIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
    if (unitErr) { console.error('[curriculum] getUnits:', unitErr.message); return { ok: false, error: LOAD_FAILED }; }

    const unitIds = (units ?? []).map(u => u.id as string);

    // الدروس النشطة + حالة الإنجاز لهذا الفصل
    type LessonRow = { id: string; unit_id: string; title: string; estimated_periods: number; sort_order: number };
    let lessons: LessonRow[] = [];
    const progressMap = new Map<string, LessonStatus>();

    if (unitIds.length > 0) {
        const { data: lessonRows, error: lesErr } = await supabase
            .from('curriculum_lessons')
            .select('id, unit_id, title, estimated_periods, sort_order')
            .eq('school_id', persona.schoolId)
            .in('unit_id', unitIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (lesErr) { console.error('[curriculum] getLessons:', lesErr.message); return { ok: false, error: LOAD_FAILED }; }
        lessons = (lessonRows ?? []) as unknown as LessonRow[];

        const lessonIds = lessons.map(l => l.id);
        if (lessonIds.length > 0) {
            const { data: prog, error: progErr } = await supabase
                .from('class_curriculum_progress')
                .select('lesson_id, status')
                .eq('school_id', persona.schoolId)
                .eq('class_id', classId)
                .in('lesson_id', lessonIds);
            if (progErr) { console.error('[curriculum] getProgress:', progErr.message); return { ok: false, error: LOAD_FAILED }; }
            (prog ?? []).forEach(p => progressMap.set(p.lesson_id as string, p.status as LessonStatus));
        }
    }

    // تجميع لكل مادة → وحدات → دروس (مع الحالة)، وعدّ المكتمل/الإجمالي الفعلي
    const subjectNameMap = Object.fromEntries((subjects ?? []).map(s => [s.id as string, s.name_ar as string]));
    const lessonsByUnit = new Map<string, LessonRow[]>();
    lessons.forEach(l => {
        const arr = lessonsByUnit.get(l.unit_id) ?? [];
        arr.push(l);
        lessonsByUnit.set(l.unit_id, arr);
    });

    type UnitRow = { id: string; subject_id: string; title: string; description: string | null };
    const unitsBySubject = new Map<string, UnitRow[]>();
    ((units ?? []) as unknown as UnitRow[]).forEach(u => {
        const arr = unitsBySubject.get(u.subject_id) ?? [];
        arr.push(u);
        unitsBySubject.set(u.subject_id, arr);
    });

    const subjectViews: SubjectCurriculumView[] = subjectIds.map(sid => {
        const sUnits = unitsBySubject.get(sid) ?? [];
        let total = 0;
        let completed = 0;
        const unitViews: CurriculumUnitView[] = sUnits.map(u => {
            const uLessons = lessonsByUnit.get(u.id) ?? [];
            const lessonViews: CurriculumLessonView[] = uLessons.map(l => {
                const status = progressMap.get(l.id) ?? 'not_started';
                total += 1;
                if (status === 'completed') completed += 1;
                return {
                    id: l.id,
                    title: l.title,
                    estimatedPeriods: l.estimated_periods,
                    status,
                };
            });
            return { id: u.id, title: u.title, description: u.description, lessons: lessonViews };
        });
        return {
            subjectId: sid,
            subjectName: subjectNameMap[sid] ?? 'مادة',
            totalLessons: total,
            completedLessons: completed,
            units: unitViews,
        };
    });

    return { ok: true, data: { gradeLevel, subjects: subjectViews } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) setLessonProgressAction — تحديث حالة درس لفصل
// ─────────────────────────────────────────────────────────────────────────────
export async function setLessonProgressAction(input: {
    classId: string;
    lessonId: string;
    status: LessonStatus;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };
    if (!CURRICULUM_OPERATORS.includes(persona.role)) {
        return { ok: false, error: 'دورك الحالي لا يسمح بتحديث تقدّم المنهج' };
    }
    if (!input.classId || !input.lessonId) return { ok: false, error: 'بيانات غير مكتملة' };
    if (!VALID_STATUS.includes(input.status)) return { ok: false, error: 'حالة الدرس غير صالحة' };

    const supabase = await createSupabaseServerClient();

    // الفصل ضمن مدرسة المُستدعي + صفّه
    const { data: cls } = await supabase
        .from('classes')
        .select('id, grade_level')
        .eq('id', input.classId)
        .eq('school_id', persona.schoolId)
        .maybeSingle();
    if (!cls) return { ok: false, error: 'الفصل لا ينتمي لهذه المدرسة' };

    // الدرس يجب أن يتبع نفس المدرسة، مع وحدته (للحصول على المادة والصف)
    const { data: lesson } = await supabase
        .from('curriculum_lessons')
        .select('id, school_id, curriculum_units!inner(id, subject_id, grade_level, school_id)')
        .eq('id', input.lessonId)
        .eq('school_id', persona.schoolId)
        .maybeSingle();
    if (!lesson) return { ok: false, error: 'الدرس غير موجود في هذه المدرسة' };

    const unit = (lesson as unknown as {
        curriculum_units: { subject_id: string; grade_level: number; school_id: string };
    }).curriculum_units;

    // الدرس يجب أن يخص منهج صفّ هذا الفصل
    if (unit.grade_level !== (cls.grade_level as number | null)) {
        return { ok: false, error: 'هذا الدرس لا يخص منهج هذا الصف' };
    }

    // المعلّم يُحدّث فقط ما هو مُسنَد إليه (الفصل + المادة). الإدارة/الإشراف على مستوى المدرسة.
    if (persona.role === 'teacher') {
        const { data: assign } = await supabase
            .from('teacher_assignments')
            .select('id')
            .eq('class_id', input.classId)
            .eq('subject_id', unit.subject_id)
            .eq('teacher_id', persona.userId)
            .eq('school_id', persona.schoolId)
            .limit(1)
            .maybeSingle();
        if (!assign) return { ok: false, error: 'هذا الفصل/المادة غير مُسنَد إليك' };
    }

    const now = new Date().toISOString();
    const { error } = await supabase
        .from('class_curriculum_progress')
        .upsert({
            school_id: persona.schoolId,
            class_id: input.classId,
            lesson_id: input.lessonId,
            status: input.status,
            completed_at: input.status === 'completed' ? now : null,
            updated_by: persona.userId,
            updated_at: now,
        }, { onConflict: 'class_id,lesson_id' });

    if (error) { console.error('[curriculum] setProgress:', error.message); return { ok: false, error: SAVE_FAILED }; }
    return { ok: true };
}
