'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { hasPermission }              from '../auth/pbac';
import { getPeriodsForStage }         from './academic-service';
import { toSafeError }                from '../safe-error';
import type { WorkflowResult }        from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PeriodSlot {
  period_id:         string;       // UUID — يُستخدم في كل DB queries
  period_number:     number;       // من periods.number — للعرض فقط
  label:             string;       // من periods.label — "الحصة الأولى"
  start_time:        string | null;
  end_time:          string | null;
  subject_id:        string | null;
  subject_name:      string | null;
  timetable_slot_id: string | null;
}

export interface ClassOption {
  id:            string;
  grade_level:   string;
  section:       string | null;
}

export interface PeriodStudent {
  student_profile_id: string;
  student_number:     string;
  name:               string;
  current_status:     'present' | 'absent' | 'late' | 'excused' | null;
  is_excused:         boolean;
}

export interface PeriodAttendanceEntry {
  student_profile_id: string;
  status:             'present' | 'absent' | 'late' | 'excused';
  is_excused?:        boolean;
  note?:              string | null;
}

export interface PeriodSummaryRow {
  period_id:    string;
  period_number: number;
  label:         string;
  subject_name:  string | null;
  total:         number;
  present:       number;
  absent:        number;
  late:          number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getClassesForTeacher
//    المعلم → فصوله فقط / الوكيل والمدير → جميع الفصول
// ─────────────────────────────────────────────────────────────────────────────

export async function getClassesForTeacher(): Promise<WorkflowResult<ClassOption[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  let classIds: string[] | null = null;

  if (persona.role === 'teacher') {
    const { data: slots } = await supabase
      .from('timetable_slots')
      .select('class_id')
      .eq('teacher_id', persona.userId)
      .eq('school_id', persona.schoolId);

    if (!slots?.length) return { ok: true, data: [] };
    classIds = [...new Set(slots.map(s => s.class_id as string))];
  }

  let query = supabase
    .from('classes')
    .select('id, grade_level, section')
    .eq('school_id', persona.schoolId)
    .order('grade_level');

  if (classIds) {
    query = query.in('id', classIds);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: toSafeError('[period-attendance] getClasses', error, 'تعذّر تحميل قائمة الفصول، يرجى المحاولة لاحقاً') };

  const classes: ClassOption[] = (data ?? []).map(c => ({
    id:          c.id,
    grade_level: c.grade_level as string,
    section:     c.section as string | null,
  }));

  return { ok: true, data: classes };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getPeriodsForClassAndDay
//    جلب حصص المرحلة للفصل في يوم محدد، مع ربط المادة من الجدول الدراسي
// ─────────────────────────────────────────────────────────────────────────────

export async function getPeriodsForClassAndDay(
  classId: string,
  dayOfWeek: number,
): Promise<WorkflowResult<PeriodSlot[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  // 1. جلب stage_id للفصل
  const { data: classRow, error: classErr } = await supabase
    .from('classes')
    .select('stage_id')
    .eq('id', classId)
    .eq('school_id', persona.schoolId)
    .maybeSingle();

  if (classErr) return { ok: false, error: toSafeError('[period-attendance] getSlots:class', classErr, 'تعذّر تحميل بيانات الفصل، يرجى المحاولة لاحقاً') };
  if (!classRow?.stage_id) {
    return { ok: false, error: 'الفصل غير مرتبط بمرحلة دراسية — يرجى مراجعة الإعدادات' };
  }

  // 2. جلب كل حصص المرحلة (مُرتبة بالرقم)
  const allPeriods = await getPeriodsForStage(classRow.stage_id as string);

  if (!allPeriods.length) {
    return { ok: true, data: [] };
  }

  // 3. جلب slots الجدول الدراسي لهذا الفصل واليوم
  const { data: slots } = await supabase
    .from('timetable_slots')
    .select('id, period_id, subject_id, subjects(name_ar)')
    .eq('class_id', classId)
    .eq('day', dayOfWeek)
    .eq('school_id', persona.schoolId);

  type SlotRow = { id: string; period_id: string | null; subject_id: string | null; subjects: { name_ar: string } | null };
  const slotMap = new Map<string, SlotRow>();
  ((slots ?? []) as unknown as SlotRow[]).forEach(s => slotMap.set(s.period_id as string, s));

  // 4. دمج: حصة المرحلة + بيانات الجدول
  const result: PeriodSlot[] = allPeriods.map(p => {
    const slot = slotMap.get(p.id);
    return {
      period_id:         p.id,
      period_number:     p.number,
      label:             p.label,
      start_time:        p.start_time,
      end_time:          p.end_time,
      subject_id:        (slot?.subject_id as string | null) ?? null,
      subject_name:      slot?.subjects?.name_ar ?? null,
      timetable_slot_id: slot?.id ?? null,
    };
  });

  return { ok: true, data: result };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getStudentsWithPeriodAttendance
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentsWithPeriodAttendance(
  classId: string,
  date: string,
  periodId: string,
): Promise<WorkflowResult<PeriodStudent[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: enrollments, error: eErr } = await supabase
    .from('student_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('is_active', true);

  if (eErr) return { ok: false, error: toSafeError('[period-attendance] getStudents:enroll', eErr, 'تعذّر تحميل قائمة الطلاب، يرجى المحاولة لاحقاً') };
  if (!enrollments?.length) return { ok: true, data: [] };

  const studentIds = enrollments.map(e => e.student_id as string);

  const { data: profiles, error: pErr } = await supabase
    .from('student_profiles')
    .select('id, name, student_id')
    .in('id', studentIds);

  if (pErr) return { ok: false, error: toSafeError('[period-attendance] getStudents:profiles', pErr, 'تعذّر تحميل بيانات الطلاب، يرجى المحاولة لاحقاً') };

  const { data: records } = await supabase
    .from('period_attendance')
    .select('student_id, status, is_excused')
    .eq('school_id', persona.schoolId)
    .eq('period_date', date)
    .eq('period_id', periodId)
    .in('student_id', studentIds);

  const recMap: Record<string, { status: string; is_excused: boolean }> = {};
  (records ?? []).forEach(r => { recMap[r.student_id] = r; });

  const students: PeriodStudent[] = (profiles ?? [])
    .map(p => {
      const rec = recMap[p.id];
      return {
        student_profile_id: p.id as string,
        student_number:     p.student_id as string,
        name:               p.name as string,
        current_status:     (rec?.status as PeriodStudent['current_status']) ?? null,
        is_excused:         rec?.is_excused ?? false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return { ok: true, data: students };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. recordPeriodAttendanceBulk
// ─────────────────────────────────────────────────────────────────────────────

export async function recordPeriodAttendanceBulk(
  classId: string,
  date: string,
  periodId: string,
  timetableSlotId: string | null,
  subjectId: string | null,
  entries: PeriodAttendanceEntry[],
): Promise<WorkflowResult<{ saved: number }>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!hasPermission({ userId: persona.userId, role: persona.role, schoolId: persona.schoolId, isSystemOwner: persona.isSystemOwner ?? false }, 'students.manage_attendance')) {
    return { ok: false, error: 'غير مُصرَّح لتسجيل الحضور' };
  }
  if (!entries.length) return { ok: true, data: { saved: 0 } };

  const supabase = await createSupabaseServerClient();

  const { data: yearRow } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', persona.schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .maybeSingle();

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .maybeSingle();

  const source = persona.role === 'teacher' ? 'teacher' : 'vp';

  const rows = entries.map(e => ({
    school_id:               persona.schoolId!,
    student_id:              e.student_profile_id,
    class_id:                classId,
    timetable_slot_id:       timetableSlotId,
    subject_id:              subjectId,
    academic_year_id:        yearRow?.id ?? null,
    period_date:             date,
    period_id:               periodId,
    status:                  e.status,
    is_excused:              e.is_excused ?? (e.status === 'excused'),
    note:                    e.note ?? null,
    source,
    marked_by_persona_id:    personaRow?.id ?? null,
    marked_by_name_snapshot: profileRow?.full_name ?? persona.role,
    marked_at:               new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('period_attendance')
    .upsert(rows, { onConflict: 'student_id,period_date,period_id,school_id' });

  if (error) return { ok: false, error: toSafeError('[period-attendance] recordBulk', error, 'تعذّر حفظ حضور الحصص، يرجى المحاولة لاحقاً') };
  return { ok: true, data: { saved: rows.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getPeriodSummaryForDate — ملخص يومي لفصل كامل
// ─────────────────────────────────────────────────────────────────────────────

export async function getPeriodSummaryForDate(
  classId: string,
  date: string,
): Promise<WorkflowResult<PeriodSummaryRow[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: records } = await supabase
    .from('period_attendance')
    .select('period_id, status, periods(number, label), subjects(name_ar)')
    .eq('school_id', persona.schoolId)
    .eq('class_id', classId)
    .eq('period_date', date);

  if (!records?.length) return { ok: true, data: [] };

  type SummaryRow = {
    period_id: string | null;
    status: string;
    periods: { number: number; label: string } | null;
    subjects: { name_ar: string } | null;
  };
  const map: Record<string, PeriodSummaryRow> = {};
  (records as unknown as SummaryRow[]).forEach(r => {
    const pid  = r.period_id as string;
    const pRow = r.periods;
    if (!map[pid]) {
      map[pid] = {
        period_id:    pid,
        period_number: pRow?.number ?? 0,
        label:         pRow?.label  ?? '',
        subject_name:  r.subjects?.name_ar ?? null,
        total: 0, present: 0, absent: 0, late: 0,
      };
    }
    map[pid].total++;
    if (r.status === 'present') map[pid].present++;
    else if (r.status === 'absent') map[pid].absent++;
    else if (r.status === 'late') map[pid].late++;
  });

  return {
    ok: true,
    data: Object.values(map).sort((a, b) => a.period_number - b.period_number),
  };
}
