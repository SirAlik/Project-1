'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { startWorkflow, advanceWorkflow, createApprovalGate } from '../workflow-service';
import type { WorkflowResult }        from '../workflow-service';
import { createGeneratedForm }        from '../quality/generated-forms';
import { toSafeError }                from '../safe-error';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ReasonCode {
  id:             string;
  code:           string;
  label_ar:       string;
  iso_clause:     string | null;
  severity:       string | null;
  default_action: string | null;
}

export interface EmployeeOption {
  persona_id: string;
  full_name:  string;
  role:       string;
  job_title:  string | null;
}

export interface SubmitCorrectiveActionInput {
  target_persona_id:       string;
  reason_code:             string;
  source:                  'internal_audit' | 'external_audit' | 'management_review' | 'complaint' | 'observation' | 'other';
  iso_clause?:             string;
  description:             string;
  corrective_action_plan?: string;
  due_date:                string;    // YYYY-MM-DD
}

export interface SubmitCorrectiveActionOutput {
  wizard_id:   string;
  instance_id: string;
  ncr_id:      string;
  ncr_number:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeNCRNumber(): string {
  const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq      = Date.now().toString().slice(-5);
  return `NCR-${datePart}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getReasonCodes
// ─────────────────────────────────────────────────────────────────────────────

export async function getReasonCodes(
  category: string,
): Promise<WorkflowResult<ReasonCode[]>> {
  const persona = await getActivePersona();
  if (!persona) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('reason_codes_catalog')
    .select('id, code, label_ar, iso_clause, severity, default_action')
    .eq('category', category)
    .eq('is_active', true)
    .order('code');

  if (error) return { ok: false, error: toSafeError('[wizard] getReasonCodes', error, 'تعذّر تحميل أكواد الأسباب، يرجى المحاولة لاحقاً') };

  return { ok: true, data: (data ?? []) as ReasonCode[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getEmployeesByRole
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmployeesByRole(
  role: string,
): Promise<WorkflowResult<EmployeeOption[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }

  const supabase = await createSupabaseServerClient();

  const { data: personaRows, error } = await supabase
    .from('user_personas')
    .select('id, user_id, role, job_title')
    .eq('school_id', persona.schoolId)
    .eq('role', role);

  if (error) return { ok: false, error: toSafeError('[wizard] getEmployeesByRole', error, 'تعذّر تحميل قائمة الموظفين، يرجى المحاولة لاحقاً') };
  if (!personaRows?.length) return { ok: true, data: [] };

  const userIds = personaRows.map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name as string]),
  );

  const result: EmployeeOption[] = personaRows.map((p) => ({
    persona_id: p.id,
    full_name:  profileMap[p.user_id] ?? 'غير معروف',
    role:       p.role,
    job_title:  p.job_title ?? null,
  }));

  return { ok: true, data: result };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. submitCorrectiveActionWizard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُطلق الإجراء التصحيحي الكامل:
 * NCR → wizard_session → workflow(CORRECTIVE_ACTION) → approval_gate → generated_form → notifications
 */
export async function submitCorrectiveActionWizard(
  input: SubmitCorrectiveActionInput,
): Promise<WorkflowResult<SubmitCorrectiveActionOutput>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }
  if (persona.role !== 'quality_coordinator' && !persona.isSystemOwner) {
    return { ok: false, error: 'هذا الإجراء مخصص لمنسق الجودة فقط' };
  }

  const supabase = await createSupabaseServerClient();

  // ── جلب بيانات المُبادر (منسق الجودة)
  const { data: actorRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!actorRow) return { ok: false, error: 'تعذّر التحقق من هوية منسق الجودة' };

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  const actorName = actorProfile?.full_name ?? persona.displayName ?? 'غير معروف';

  // ── جلب بيانات الموظف المستهدف
  const { data: targetRow } = await supabase
    .from('user_personas')
    .select('id, user_id, role, job_title')
    .eq('id', input.target_persona_id)
    .eq('school_id', persona.schoolId)
    .single();

  if (!targetRow) return { ok: false, error: 'الموظف المستهدف غير موجود في هذه المدرسة' };

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', targetRow.user_id)
    .single();

  const targetName = targetProfile?.full_name ?? 'غير معروف';

  // ── إنشاء تقرير عدم المطابقة
  const ncrNumber = makeNCRNumber();
  const { data: ncr, error: ncrErr } = await supabase
    .from('nonconformance_reports')
    .insert({
      school_id:                  persona.schoolId,
      report_number:              ncrNumber,
      source:                     input.source,
      iso_clause:                 input.iso_clause ?? null,
      description:                input.description,
      corrective_action_plan:     input.corrective_action_plan ?? null,
      detected_by_persona_id:     actorRow.id,
      detected_by_name_snapshot:  actorName,
      status:                     'open',
    })
    .select('id')
    .single();

  if (ncrErr || !ncr) {
    return { ok: false, error: toSafeError('[wizard] submitCorrectiveAction:ncr', ncrErr, 'تعذّر إنشاء تقرير عدم المطابقة، يرجى المحاولة لاحقاً') };
  }

  // ── إطلاق الـ workflow (يُنشئ instance بحالة 'draft')
  const wfResult = await startWorkflow({
    workflow_code: 'CORRECTIVE_ACTION',
    subject_ref: {
      table:     'nonconformance_reports',
      id:        ncr.id,
      type:      'إجراء تصحيحي',
      display:   `${targetName} — ${ncrNumber}`,
      school_id: persona.schoolId,
    },
    context_data: {
      ncr_number:   ncrNumber,
      reason_code:  input.reason_code,
      target_name:  targetName,
      target_role:  targetRow.role,
    },
    due_date: input.due_date,
  });

  if (!wfResult.ok) {
    // تراجع: حذف NCR الذي أُنشئ
    await supabase.from('nonconformance_reports').delete().eq('id', ncr.id);
    return wfResult;
  }

  const instanceId = wfResult.data.instance_id;

  // ── تقديم الـ wizard (draft → awaiting_acknowledgment)
  const advResult = await advanceWorkflow({
    workflow_instance_id: instanceId,
    action:               'submit',
  });

  if (!advResult.ok) {
    console.error('[wizard] submitCorrectiveAction:advance:', advResult.error);
    return { ok: false, error: 'تعذّر تقديم الإجراء التصحيحي، يرجى المحاولة لاحقاً' };
  }

  // ── بوابة الموافقة: إقرار الموظف المستهدف
  await createApprovalGate({
    workflow_instance_id:    instanceId,
    gate_name:               'target_acknowledgment',
    required_role:           targetRow.role,
    assigned_to_persona_id:  input.target_persona_id,
    decision_options: {
      approve: 'قبول الإجراء التصحيحي والالتزام بتنفيذه',
      reject:  'الاعتراض مع تقديم شواهد داعمة',
    },
    due_date:        input.due_date,
    escalation_role: 'school_principal',
  });

  // ── تسجيل النموذج المُولَّد (QF03-1) عبر خدمة السجلّ المُبوّبة بسجلّ المستأجر (+ منع تكرار)
  // best-effort: school_id يُشتق داخل الخدمة من سياق مصادَق؛ فشل التسجيل (قالب غير مُنفَّذ/مدرسة
  // غير مُسجَّلة) لا يُفشِل الإجراء التصحيحي. QF03-1 مُنفَّذ في السجلّ لمستأجر الفلاح.
  await createGeneratedForm({
    formCode:           'QF03-1',
    sourceTable:        'nonconformance_reports',
    sourceRecordId:     ncr.id,
    workflowInstanceId: instanceId,
    formData: {
      ncr_number:  ncrNumber,
      target_name: targetName,
      target_role: targetRow.role,
      description: input.description,
      reason_code: input.reason_code,
      due_date:    input.due_date,
      detected_by: actorName,
      detected_at: new Date().toISOString(),
    },
    isReady: false,
  });

  // ── تسجيل جلسة المعالج
  const { data: wizardSession, error: wizardErr } = await supabase
    .from('wizard_sessions')
    .insert({
      school_id:                  persona.schoolId,
      wizard_type:                'corrective_action',
      workflow_instance_id:       instanceId,
      initiated_by_persona_id:    actorRow.id,
      initiated_by_name_snapshot: actorName,
      target_persona_id:          input.target_persona_id,
      target_name_snapshot:       targetName,
      target_role_snapshot:       targetRow.role,
      form_data: {
        source:                  input.source,
        iso_clause:              input.iso_clause ?? null,
        description:             input.description,
        corrective_action_plan:  input.corrective_action_plan ?? null,
        reason_code:             input.reason_code,
        due_date:                input.due_date,
      },
      reason_codes:  [input.reason_code],
      status:        'submitted',
      qms_form_code: 'QF03-1',
      submitted_at:  new Date().toISOString(),
    })
    .select('id')
    .single();

  if (wizardErr || !wizardSession) {
    return { ok: false, error: toSafeError('[wizard] submitCorrectiveAction:session', wizardErr, 'تعذّر حفظ جلسة المعالج، يرجى المحاولة لاحقاً') };
  }

  // ── ربط الـ NCR بالـ workflow + تحديث الحالة
  await supabase
    .from('nonconformance_reports')
    .update({ workflow_instance_id: instanceId, status: 'in_progress' })
    .eq('id', ncr.id);

  // ── إشعار الموظف المستهدف
  await supabase.from('notifications').insert([
    {
      school_id:            persona.schoolId,
      recipient_persona_id: input.target_persona_id,
      notification_type:    'gate_assigned',
      title:                'إجراء تصحيحي يستوجب إقرارك',
      body:                 `أصدر منسق الجودة إجراءً تصحيحياً (${ncrNumber}) يستلزم ردك. يرجى الاطلاع واتخاذ القرار.`,
      source_table:         'nonconformance_reports',
      source_record_id:     ncr.id,
      workflow_instance_id: instanceId,
    },
    // تأكيد لمنسق الجودة نفسه
    {
      school_id:            persona.schoolId,
      recipient_persona_id: actorRow.id,
      notification_type:    'wizard_submitted',
      title:                `تم إطلاق الإجراء التصحيحي ${ncrNumber}`,
      body:                 `أُرسل الإجراء التصحيحي إلى ${targetName} بانتظار الإقرار.`,
      source_table:         'nonconformance_reports',
      source_record_id:     ncr.id,
      workflow_instance_id: instanceId,
    },
  ]);

  return {
    ok: true,
    data: {
      wizard_id:   wizardSession.id,
      instance_id: instanceId,
      ncr_id:      ncr.id,
      ncr_number:  ncrNumber,
    },
  };
}
