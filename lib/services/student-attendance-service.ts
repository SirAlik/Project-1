'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { toSafeError }                from '../safe-error';
import type { WorkflowResult }        from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassOption {
  id: string;
  grade_level: string;
  section: string | null;
  student_count: number;
}

export interface AttendanceStudent {
  student_profile_id: string;
  student_number:     string;
  name:               string;
  current_status:     'present' | 'absent' | 'late' | 'excused' | null;
  is_excused:         boolean;
  excuse_reason:      string | null;
}

export interface AttendanceEntry {
  student_profile_id: string;
  status:             'present' | 'absent' | 'late' | 'excused';
  is_excused?:        boolean;
  excuse_reason?:     string | null;
}

export interface DailyAttendanceRow {
  id:                       string;
  student_id:               string;
  attendance_date:          string;
  status:                   string;
  is_excused:               boolean;
  excuse_reason:            string | null;
  recorded_by_name_snapshot: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getClassesForAttendance
// ─────────────────────────────────────────────────────────────────────────────

export async function getClassesForAttendance(): Promise<WorkflowResult<ClassOption[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('classes')
    .select('id, grade_level, section')
    .eq('school_id', persona.schoolId)
    .order('grade_level');

  if (error) return { ok: false, error: toSafeError('[student-attendance] getClasses', error, 'تعذّر تحميل قائمة الفصول، يرجى المحاولة لاحقاً') };
  if (!data?.length) return { ok: true, data: [] };

  // عدد الطلاب المسجّلين في كل فصل
  const classIds = data.map(c => c.id);
  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('is_active', true);

  const countMap: Record<string, number> = {};
  (enrollments ?? []).forEach(e => {
    countMap[e.class_id] = (countMap[e.class_id] ?? 0) + 1;
  });

  const classes: ClassOption[] = data.map(c => ({
    id:            c.id,
    grade_level:   c.grade_level as string,
    section:       c.section as string | null,
    student_count: countMap[c.id] ?? 0,
  }));

  return { ok: true, data: classes };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getStudentsWithAttendance
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentsWithAttendance(
  classId: string,
  date: string,
): Promise<WorkflowResult<AttendanceStudent[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  // الطلاب المسجّلون في الفصل
  const { data: enrollments, error: enrollError } = await supabase
    .from('student_enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('is_active', true);

  if (enrollError) return { ok: false, error: toSafeError('[student-attendance] getStudents:enroll', enrollError, 'تعذّر تحميل قائمة الطلاب، يرجى المحاولة لاحقاً') };
  if (!enrollments?.length) return { ok: true, data: [] };

  const studentIds = enrollments.map(e => e.student_id as string);

  // بيانات الطلاب
  const { data: profiles, error: profilesError } = await supabase
    .from('student_profiles')
    .select('id, name, student_id')
    .in('id', studentIds);

  if (profilesError) return { ok: false, error: toSafeError('[student-attendance] getStudents:profiles', profilesError, 'تعذّر تحميل بيانات الطلاب، يرجى المحاولة لاحقاً') };

  // سجلات الحضور لليوم المحدد
  const { data: attendanceRows } = await supabase
    .from('student_daily_attendance')
    .select('student_id, status, is_excused, excuse_reason')
    .eq('school_id', persona.schoolId)
    .eq('attendance_date', date)
    .in('student_id', studentIds);

  const attendanceMap: Record<string, typeof attendanceRows extends (infer T)[] | null ? T : never> = {};
  (attendanceRows ?? []).forEach(r => {
    attendanceMap[r.student_id] = r;
  });

  const students: AttendanceStudent[] = (profiles ?? [])
    .map(p => {
      const rec = attendanceMap[p.id];
      return {
        student_profile_id: p.id as string,
        student_number:     p.student_id as string,
        name:               p.name as string,
        current_status:     (rec?.status as AttendanceStudent['current_status']) ?? null,
        is_excused:         rec?.is_excused ?? false,
        excuse_reason:      rec?.excuse_reason ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  return { ok: true, data: students };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. recordAttendanceBulk
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = new Set([
  'student_affairs_vp', 'school_affairs_vp',
  'school_principal', 'school_admin', 'teacher',
]);

export async function recordAttendanceBulk(
  classId: string,
  date: string,
  entries: AttendanceEntry[],
): Promise<WorkflowResult<{ saved: number }>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!ALLOWED_ROLES.has(persona.role) && !persona.isSystemOwner) {
    return { ok: false, error: 'غير مُصرَّح لتسجيل الحضور' };
  }
  if (!entries.length) return { ok: true, data: { saved: 0 } };

  const supabase = await createSupabaseServerClient();

  // السنة الدراسية النشطة
  const { data: yearRow } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  // الفصل الدراسي النشط (term_id NOT NULL في student_daily_attendance)
  const { data: termRow } = await supabase
    .from('terms')
    .select('id')
    .eq('school_id', persona.schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!termRow) {
    return { ok: false, error: 'لا يوجد فصل دراسي نشط — يرجى إعداد الفصول الدراسية أولاً' };
  }

  // persona_id للمسجّل
  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .maybeSingle();

  // اسم المسجّل
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .maybeSingle();

  const rows = entries.map(e => ({
    school_id:                 persona.schoolId!,
    student_id:                e.student_profile_id,
    class_id:                  classId,
    academic_year_id:          yearRow?.id ?? null,
    term_id:                   termRow.id,
    attendance_date:           date,
    status:                    e.status,
    is_excused:                e.is_excused ?? (e.status === 'excused'),
    excuse_reason:             e.excuse_reason ?? null,
    recorded_by_persona_id:    personaRow?.id ?? null,
    recorded_by_name_snapshot: profileRow?.full_name ?? persona.role,
  }));

  const { error } = await supabase
    .from('student_daily_attendance')
    .upsert(rows, { onConflict: 'student_id,attendance_date,school_id' });

  if (error) return { ok: false, error: toSafeError('[student-attendance] recordBulk', error, 'تعذّر حفظ الحضور، يرجى المحاولة لاحقاً') };
  return { ok: true, data: { saved: rows.length } };
}
