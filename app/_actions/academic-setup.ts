'use server';

import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona }           from '@/lib/auth/context-service';
import { toSafeError }                from '@/lib/safe-error';
import type { WorkflowResult }        from '@/lib/workflow-service';
import { revalidatePath }             from 'next/cache';

type StageCode = 'elementary' | 'middle' | 'high';

const SETUP_ROLES = new Set(['school_admin', 'school_principal', 'system_owner']);

async function guardSetup() {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return null;
  if (!SETUP_ROLES.has(persona.role) && !persona.isSystemOwner) return null;
  return persona;
}

// ─────────────────────────────────────────────────────────────────────────────
// School Stages
// ─────────────────────────────────────────────────────────────────────────────

export async function createStage(data: {
  schoolId:  string;
  name:      string;
  code:      StageCode;
  gradeFrom: number;
  gradeTo:   number;
}): Promise<WorkflowResult<{ id: string }>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from('school_stages')
    .insert({
      school_id:  data.schoolId,
      name:       data.name,
      code:       data.code,
      grade_from: data.gradeFrom,
      grade_to:   data.gradeTo,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'هذه المرحلة مضافة مسبقاً' };
    return { ok: false, error: toSafeError('[academic-setup] createStage', error, 'تعذّر إضافة المرحلة، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${data.schoolId}/academic-setup`);
  return { ok: true, data: { id: row.id } };
}

export async function deleteStage(stageId: string, schoolId: string): Promise<WorkflowResult<void>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('school_stages')
    .delete()
    .eq('id', stageId);

  if (error) {
    if (error.code === '23503') return { ok: false, error: 'لا يمكن الحذف — توجد فصول أو حصص مرتبطة بهذه المرحلة' };
    return { ok: false, error: toSafeError('[academic-setup] deleteStage', error, 'تعذّر حذف المرحلة، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${schoolId}/academic-setup`);
  return { ok: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// Periods
// ─────────────────────────────────────────────────────────────────────────────

export async function createPeriod(data: {
  schoolId:  string;
  stageId:   string;
  number:    number;
  label:     string;
  startTime: string | null;
  endTime:   string | null;
}): Promise<WorkflowResult<{ id: string }>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from('periods')
    .insert({
      school_id:       data.schoolId,
      school_stage_id: data.stageId,
      number:          data.number,
      label:           data.label,
      start_time:      data.startTime || null,
      end_time:        data.endTime   || null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: `رقم الحصة ${data.number} مضاف مسبقاً لهذه المرحلة` };
    return { ok: false, error: toSafeError('[academic-setup] createPeriod', error, 'تعذّر إضافة الحصة، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${data.schoolId}/academic-setup`);
  return { ok: true, data: { id: row.id } };
}

export async function createPeriodsQuick(stageId: string, schoolId: string): Promise<WorkflowResult<{ count: number }>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const DEFAULTS = [
    { number: 1, label: 'الحصة الأولى',   start_time: '07:30', end_time: '08:15' },
    { number: 2, label: 'الحصة الثانية',  start_time: '08:20', end_time: '09:05' },
    { number: 3, label: 'الحصة الثالثة',  start_time: '09:10', end_time: '09:55' },
    { number: 4, label: 'الحصة الرابعة',  start_time: '10:20', end_time: '11:05' },
    { number: 5, label: 'الحصة الخامسة',  start_time: '11:10', end_time: '11:55' },
    { number: 6, label: 'الحصة السادسة',  start_time: '12:00', end_time: '12:45' },
    { number: 7, label: 'الحصة السابعة',  start_time: '12:50', end_time: '13:35' },
    { number: 8, label: 'الحصة الثامنة',  start_time: '13:40', end_time: '14:25' },
  ];

  const supabase = await createSupabaseServerClient();
  const rows = DEFAULTS.map(d => ({
    school_id:       schoolId,
    school_stage_id: stageId,
    ...d,
  }));

  const { error } = await supabase
    .from('periods')
    .upsert(rows, { onConflict: 'school_stage_id,number', ignoreDuplicates: true })
    .select();

  if (error) return { ok: false, error: toSafeError('[academic-setup] createPeriodsQuick', error, 'تعذّر إنشاء الحصص الافتراضية، يرجى المحاولة لاحقاً') };

  revalidatePath(`/school/${schoolId}/academic-setup`);
  return { ok: true, data: { count: rows.length } };
}

export async function deletePeriod(periodId: string, schoolId: string): Promise<WorkflowResult<void>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('periods')
    .delete()
    .eq('id', periodId);

  if (error) {
    if (error.code === '23503') return { ok: false, error: 'لا يمكن الحذف — توجد سجلات حضور مرتبطة بهذه الحصة' };
    return { ok: false, error: toSafeError('[academic-setup] deletePeriod', error, 'تعذّر حذف الحصة، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${schoolId}/academic-setup`);
  return { ok: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// Terms
// ─────────────────────────────────────────────────────────────────────────────

export async function createTerm(data: {
  schoolId:       string;
  academicYearId: string;
  number:         1 | 2 | 3;
  name:           string;
  startDate:      string | null;
  endDate:        string | null;
}): Promise<WorkflowResult<{ id: string }>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from('terms')
    .insert({
      school_id:        data.schoolId,
      academic_year_id: data.academicYearId,
      number:           data.number,
      name:             data.name,
      start_date:       data.startDate || null,
      end_date:         data.endDate   || null,
      is_active:        false,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: `الفصل الدراسي رقم ${data.number} مضاف مسبقاً` };
    return { ok: false, error: toSafeError('[academic-setup] createTerm', error, 'تعذّر إضافة الفصل الدراسي، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${data.schoolId}/academic-setup`);
  return { ok: true, data: { id: row.id } };
}

export async function setActiveTerm(termId: string, schoolId: string, academicYearId: string): Promise<WorkflowResult<void>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();

  // إلغاء تفعيل كل الفصول الأخرى لنفس المدرسة والسنة
  const { error: deactivateErr } = await supabase
    .from('terms')
    .update({ is_active: false })
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .neq('id', termId);

  if (deactivateErr) return { ok: false, error: toSafeError('[academic-setup] setActiveTerm:deactivate', deactivateErr, 'تعذّر تفعيل الفصل الدراسي، يرجى المحاولة لاحقاً') };

  const { error } = await supabase
    .from('terms')
    .update({ is_active: true })
    .eq('id', termId);

  if (error) return { ok: false, error: toSafeError('[academic-setup] setActiveTerm:activate', error, 'تعذّر تفعيل الفصل الدراسي، يرجى المحاولة لاحقاً') };

  revalidatePath(`/school/${schoolId}/academic-setup`);
  return { ok: true, data: undefined };
}

export async function deleteTerm(termId: string, schoolId: string): Promise<WorkflowResult<void>> {
  const persona = await guardSetup();
  if (!persona) return { ok: false, error: 'غير مُصرَّح' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('terms')
    .delete()
    .eq('id', termId);

  if (error) {
    if (error.code === '23503') return { ok: false, error: 'لا يمكن الحذف — توجد سجلات حضور مرتبطة بهذا الفصل' };
    return { ok: false, error: toSafeError('[academic-setup] deleteTerm', error, 'تعذّر حذف الفصل الدراسي، يرجى المحاولة لاحقاً') };
  }

  revalidatePath(`/school/${schoolId}/academic-setup`);
  return { ok: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries (للصفحة الرئيسية)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAcademicSetupData(schoolId: string) {
  const supabase = await createSupabaseServerClient();

  const [stagesRes, yearRes] = await Promise.all([
    supabase
      .from('school_stages')
      .select('id, name, code, grade_from, grade_to')
      .eq('school_id', schoolId)
      .order('grade_from'),
    supabase
      .from('academic_years')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  type TermRow = { id: string; number: number; name: string; start_date: string; end_date: string; is_active: boolean };
  const activeYear = yearRes.data;
  let terms: TermRow[] = [];

  if (activeYear) {
    const { data } = await supabase
      .from('terms')
      .select('id, number, name, start_date, end_date, is_active')
      .eq('school_id', schoolId)
      .eq('academic_year_id', activeYear.id)
      .order('number');
    terms = data ?? [];
  }

  return {
    stages:     stagesRes.data ?? [],
    activeYear: activeYear ?? null,
    terms,
  };
}

export async function getPeriodsForStageAction(stageId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('periods')
    .select('id, number, label, start_time, end_time')
    .eq('school_stage_id', stageId)
    .order('number');
  return data ?? [];
}
