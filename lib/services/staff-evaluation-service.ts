'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import type { WorkflowResult }        from '../workflow-service';
import type { StaffEvaluation }       from '../types/layer6';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvalListRow {
  id: string;
  evaluation_number: string;
  academic_year: string;
  evaluatee_name_snapshot: string;
  evaluatee_role_snapshot: string;
  evaluator_name_snapshot: string | null;
  percentage: number | null;
  performance_level: string | null;
  status: string;
  created_at: string;
}

export interface StaffOption {
  persona_id: string;
  full_name: string;
  role: string;
}

export interface CreateEvalInput {
  evaluatee_persona_id: string;
  evaluatee_name_snapshot: string;
  evaluatee_role_snapshot: string;
  academic_year: string;
  evaluation_period_start?: string | null;
  evaluation_period_end?: string | null;
  scores: Record<string, number>;
  total_score: number;
  max_score: number;
  evaluator_notes?: string | null;
  development_plan?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function derivePerformanceLevel(pct: number): StaffEvaluation['performance_level'] {
  if (pct >= 90) return 'excellent';
  if (pct >= 80) return 'very_good';
  if (pct >= 70) return 'good';
  if (pct >= 60) return 'satisfactory';
  return 'needs_improvement';
}

async function generateEvalNumber(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  schoolId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EVAL-${year}`;
  const { count } = await supabase
    .from('staff_evaluations')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .like('evaluation_number', `${prefix}-%`);
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getStaffForEvaluation
// ─────────────────────────────────────────────────────────────────────────────

export async function getStaffForEvaluation(): Promise<WorkflowResult<StaffOption[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: personaRows, error } = await supabase
    .from('user_personas')
    .select('id, user_id, role')
    .eq('school_id', persona.schoolId)
    .not('role', 'in', '("student","parent","system_owner")');

  if (error) return { ok: false, error: error.message };
  if (!personaRows?.length) return { ok: true, data: [] };

  const userIds = personaRows.map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name as string]),
  );

  const staff: StaffOption[] = personaRows.map((p) => ({
    persona_id: p.id,
    full_name: profileMap[p.user_id] ?? 'غير معروف',
    role: p.role,
  }));

  return { ok: true, data: staff };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. createStaffEvaluation
// ─────────────────────────────────────────────────────────────────────────────

export async function createStaffEvaluation(
  input: CreateEvalInput,
): Promise<WorkflowResult<Pick<StaffEvaluation, 'id'>>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  if (!['school_principal', 'school_admin'].includes(persona.role)) {
    return { ok: false, error: 'غير مُصرَّح — يتطلب صلاحية المدير' };
  }

  const supabase = await createSupabaseServerClient();

  // جلب persona id للمُقيِّم
  const { data: evaluatorRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!evaluatorRow) return { ok: false, error: 'تعذّر التحقق من هويتك' };

  // جلب اسم المُقيِّم
  const { data: evaluatorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  const percentage =
    input.max_score > 0
      ? Math.round((input.total_score / input.max_score) * 10000) / 100
      : 0;

  const evaluation_number = await generateEvalNumber(supabase, persona.schoolId);

  const { data, error } = await supabase
    .from('staff_evaluations')
    .insert({
      school_id:                  persona.schoolId,
      evaluation_number,
      academic_year:              input.academic_year,
      evaluatee_persona_id:       input.evaluatee_persona_id,
      evaluatee_name_snapshot:    input.evaluatee_name_snapshot,
      evaluatee_role_snapshot:    input.evaluatee_role_snapshot,
      evaluator_persona_id:       evaluatorRow.id,
      evaluator_name_snapshot:    evaluatorProfile?.full_name ?? persona.role,
      evaluation_period_start:    input.evaluation_period_start ?? null,
      evaluation_period_end:      input.evaluation_period_end ?? null,
      scores:                     input.scores,
      total_score:                input.total_score,
      max_score:                  input.max_score,
      percentage,
      performance_level:          derivePerformanceLevel(percentage),
      evaluator_notes:            input.evaluator_notes ?? null,
      development_plan:           input.development_plan ?? null,
      status:                     'completed',
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as unknown as Pick<StaffEvaluation, 'id'> };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getEvaluationsList
// ─────────────────────────────────────────────────────────────────────────────

export async function getEvaluationsList(): Promise<WorkflowResult<EvalListRow[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('staff_evaluations')
    .select(
      'id, evaluation_number, academic_year, evaluatee_name_snapshot, evaluatee_role_snapshot, ' +
      'evaluator_name_snapshot, percentage, performance_level, status, created_at',
    )
    .eq('school_id', persona.schoolId)
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as unknown as EvalListRow[] };
}
