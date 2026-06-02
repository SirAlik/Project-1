import { createSupabaseServerClient } from './db/supabase-server';
import { getActivePersona, PersonaContext } from './auth/context-service';
import type { WorkflowStates } from './types/workflow';

// ─────────────────────────────────────────────────────────────────────────────
// Result type — موحّد لجميع دوال الخدمة
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * يُحدِّد user_personas.id واسم الموظف من profiles.
 * مطلوب لتسجيل بيانات الممثل في workflow_transitions و approval_gates.
 */
async function resolveActor(
  supabase: SupabaseClient,
  persona: PersonaContext
): Promise<{ persona_id: string; full_name: string } | null> {
  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId!)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  return {
    persona_id: personaRow.id,
    full_name: profile?.full_name ?? persona.displayName ?? 'غير معروف',
  };
}

/**
 * يتحقق إذا كان الممثل مُخوَّلاً بتنفيذ هذا الانتقال.
 * - 'system': محجوز للعمليات التلقائية — لا يُسمح للمستخدمين
 * - دور محدد (quality_coordinator مثلاً): يجب أن يطابق دور المستخدم
 * - placeholder (target_staff, organizer, evaluatee, uploader): مسموح لأي موظف بالمدرسة
 */
function isActorAllowed(
  transitionActor: string,
  personaRole: string,
  isSystemOwner: boolean
): boolean {
  if (isSystemOwner) return true;
  if (transitionActor === 'system') return false;
  if (transitionActor === personaRole) return true;
  const placeholders = ['target_staff', 'organizer', 'evaluatee', 'uploader'];
  return placeholders.includes(transitionActor);
}

function isFinalState(states: WorkflowStates, stateName: string): boolean {
  return states.final.includes(stateName);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. startWorkflow
// ─────────────────────────────────────────────────────────────────────────────

export interface StartWorkflowInput {
  workflow_code: string;
  subject_ref: {
    table: string;
    id: string;
    type: string;
    display: string;
    school_id: string;
  };
  context_data?: Record<string, unknown>;
  due_date?: string;
}

export interface StartWorkflowOutput {
  instance_id: string;
  current_state: string;
  workflow_code: string;
}

/**
 * يُنشئ workflow instance جديد ويُسجّل انتقال البداية.
 *
 * التحققات:
 * - المستخدم مُوثَّق وله سياق مدرسة
 * - subject_ref.school_id يطابق سياق المستخدم
 * - دور المستخدم موجود في required_roles للـ workflow
 * - workflow_code نشط في workflow_definitions
 */
export async function startWorkflow(
  input: StartWorkflowInput
): Promise<WorkflowResult<StartWorkflowOutput>> {
  const persona = await getActivePersona();
  if (!persona)           return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!persona.schoolId)  return { ok: false, error: 'يتطلب هذا الإجراء سياق مدرسة' };

  if (input.subject_ref.school_id !== persona.schoolId) {
    return { ok: false, error: 'تعارض في school_id: subject_ref لا يطابق سياق المستخدم' };
  }

  const supabase = await createSupabaseServerClient();

  const actor = await resolveActor(supabase, persona);
  if (!actor) return { ok: false, error: 'تعذّر التحقق من هوية المستخدم في user_personas' };

  // جلب تعريف الـ workflow
  const { data: definition } = await supabase
    .from('workflow_definitions')
    .select('workflow_code, states, required_roles')
    .eq('workflow_code', input.workflow_code)
    .eq('is_active', true)
    .single();

  if (!definition) {
    return { ok: false, error: `الـ workflow "${input.workflow_code}" غير موجود أو غير نشط` };
  }

  const states = definition.states as WorkflowStates;
  const requiredRoles: string[] = definition.required_roles ?? [];

  if (!persona.isSystemOwner && !requiredRoles.includes(persona.role)) {
    return {
      ok: false,
      error: `دورك "${persona.role}" غير مُعتمد لبدء workflow من نوع "${input.workflow_code}"`,
    };
  }

  // فحص التكرار: هل يوجد workflow نشط لنفس subject_ref؟
  const { data: existing } = await supabase
    .from('workflow_instances')
    .select('id')
    .eq('school_id', persona.schoolId)
    .eq('workflow_code', input.workflow_code)
    .eq('subject_ref->>id', input.subject_ref.id)
    .in('status', ['in_progress', 'pending'])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: `يوجد workflow نشط مسبقاً لهذا العنصر (workflow_code: ${input.workflow_code})`,
    };
  }

  // إنشاء workflow_instance
  const { data: instance, error: instanceErr } = await supabase
    .from('workflow_instances')
    .insert({
      school_id:               persona.schoolId,
      workflow_code:           input.workflow_code,
      current_state:           states.initial,
      initiator_persona_id:    actor.persona_id,
      initiator_role_snapshot: persona.role,
      initiator_name_snapshot: actor.full_name,
      subject_ref:             input.subject_ref,
      context_data:            input.context_data ?? null,
      due_date:                input.due_date ?? null,
      status:                  'in_progress',
    })
    .select('id, current_state, workflow_code')
    .single();

  if (instanceErr || !instance) {
    return { ok: false, error: `فشل إنشاء workflow instance: ${instanceErr?.message}` };
  }

  // تسجيل انتقال البداية (from_state = '' → initial_state)
  const { error: transitionErr } = await supabase
    .from('workflow_transitions')
    .insert({
      workflow_instance_id: instance.id,
      school_id:            persona.schoolId,
      from_state:           '',
      to_state:             states.initial,
      action:               'start',
      is_system_action:     false,
      actor_persona_id:     actor.persona_id,
      actor_user_id:        persona.userId,
      actor_role_snapshot:  persona.role,
      actor_name_snapshot:  actor.full_name,
    });

  if (transitionErr) {
    // الـ instance أُنشئ — نُسجّل الخطأ لكن لا نُلغي العملية
    console.error('[workflow-service] startWorkflow: transition insert failed:', transitionErr.message);
  }

  return {
    ok: true,
    data: {
      instance_id:   instance.id,
      current_state: instance.current_state,
      workflow_code: instance.workflow_code,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. advanceWorkflow
// ─────────────────────────────────────────────────────────────────────────────

export interface AdvanceWorkflowInput {
  workflow_instance_id: string;
  action: string;
  decision_notes?: string;
  attachments?: string[];
  signature_hash?: string;
}

export interface AdvanceWorkflowOutput {
  instance_id: string;
  from_state: string;
  to_state: string;
  status: string;
}

/**
 * يُنقِل workflow_instance من حالته الحالية إلى الحالة التالية.
 *
 * التحققات:
 * - الـ instance موجود ومرتبط بمدرسة المستخدم (RLS + explicit check)
 * - الـ instance في حالة 'in_progress'
 * - الإجراء (action) صالح من الحالة الحالية حسب workflow_definitions.states
 * - دور المستخدم مُخوَّل بتنفيذ هذا الانتقال
 *
 * ملاحظة: INSERT transition ثم UPDATE instance ليسا atomic في v1.
 * إذا فشل UPDATE بعد نجاح INSERT: الانتقال مُسجَّل لكن الحالة لم تتغير.
 * الحل المستقبلي: تحويل هذه العملية إلى SECURITY DEFINER RPC.
 */
export async function advanceWorkflow(
  input: AdvanceWorkflowInput
): Promise<WorkflowResult<AdvanceWorkflowOutput>> {
  const persona = await getActivePersona();
  if (!persona)          return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!persona.schoolId) return { ok: false, error: 'يتطلب هذا الإجراء سياق مدرسة' };

  const supabase = await createSupabaseServerClient();

  const actor = await resolveActor(supabase, persona);
  if (!actor) return { ok: false, error: 'تعذّر التحقق من هوية المستخدم في user_personas' };

  // جلب الـ instance (RLS يضمن العزل بين المدارس)
  const { data: instance } = await supabase
    .from('workflow_instances')
    .select('id, school_id, workflow_code, current_state, status')
    .eq('id', input.workflow_instance_id)
    .single();

  if (!instance) {
    return { ok: false, error: 'الـ workflow instance غير موجود أو لا تملك صلاحية الوصول إليه' };
  }

  if (instance.status !== 'in_progress') {
    return { ok: false, error: `لا يمكن تقديم إجراء على workflow بحالة "${instance.status}"` };
  }

  // جلب تعريف الـ workflow
  const { data: definition } = await supabase
    .from('workflow_definitions')
    .select('states')
    .eq('workflow_code', instance.workflow_code)
    .single();

  if (!definition) {
    return { ok: false, error: 'تعذّر جلب تعريف الـ workflow' };
  }

  const states = definition.states as WorkflowStates;

  // البحث عن الانتقال الصالح
  const transition = states.transitions.find(
    (t) => t.from === instance.current_state && t.action === input.action
  );

  if (!transition) {
    return {
      ok: false,
      error: `الإجراء "${input.action}" غير مسموح من الحالة "${instance.current_state}"`,
    };
  }

  // التحقق من صلاحية الممثل
  if (!isActorAllowed(transition.actor, persona.role, persona.isSystemOwner ?? false)) {
    return {
      ok: false,
      error: `دورك "${persona.role}" غير مُخوَّل بتنفيذ الإجراء "${input.action}"`,
    };
  }

  const newState = transition.to;
  const isCompleted = isFinalState(states, newState);

  // تسجيل الانتقال (append-only — trigger يمنع أي UPDATE لاحق)
  const { error: transitionErr } = await supabase
    .from('workflow_transitions')
    .insert({
      workflow_instance_id: instance.id,
      school_id:            instance.school_id,
      from_state:           instance.current_state,
      to_state:             newState,
      action:               input.action,
      is_system_action:     false,
      actor_persona_id:     actor.persona_id,
      actor_user_id:        persona.userId,
      actor_role_snapshot:  persona.role,
      actor_name_snapshot:  actor.full_name,
      decision_notes:       input.decision_notes  ?? null,
      attachments:          input.attachments     ?? [],
      signature_hash:       input.signature_hash  ?? null,
    });

  if (transitionErr) {
    return { ok: false, error: `فشل تسجيل الانتقال: ${transitionErr.message}` };
  }

  // تحديث حالة الـ instance
  const updatePayload: Record<string, unknown> = {
    current_state: newState,
    status:        isCompleted ? 'completed' : 'in_progress',
  };
  if (isCompleted) {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from('workflow_instances')
    .update(updatePayload)
    .eq('id', instance.id);

  if (updateErr) {
    return { ok: false, error: `فشل تحديث حالة الـ workflow: ${updateErr.message}` };
  }

  return {
    ok: true,
    data: {
      instance_id: instance.id,
      from_state:  instance.current_state,
      to_state:    newState,
      status:      isCompleted ? 'completed' : 'in_progress',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. decideGate
// ─────────────────────────────────────────────────────────────────────────────

export interface DecideGateInput {
  gate_id: string;
  decision: 'approved' | 'rejected';
  selected_option?: string;
  justification?: string;
  signature_hash?: string;
}

export interface DecideGateOutput {
  gate_id: string;
  status: 'approved' | 'rejected';
  workflow_instance_id: string;
}

/**
 * يُسجّل قرار الموافقة أو الرفض على approval gate.
 *
 * المُخوَّلون باتخاذ القرار:
 * - assigned_to_persona_id يطابق هوية المستخدم الحالي
 * - أو دور المستخدم يطابق required_role للـ gate
 * - أو المستخدم system_owner
 *
 * ملاحظة: decideGate لا يُشغّل advanceWorkflow تلقائياً في v1.
 * المنطق الأعلى مستوى (Server Action أو صفحة محددة) هو المسؤول
 * عن استدعاء advanceWorkflow بعد القرار بالإجراء المناسب.
 */
export async function decideGate(
  input: DecideGateInput
): Promise<WorkflowResult<DecideGateOutput>> {
  const persona = await getActivePersona();
  if (!persona)          return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!persona.schoolId) return { ok: false, error: 'يتطلب هذا الإجراء سياق مدرسة' };

  const supabase = await createSupabaseServerClient();

  const actor = await resolveActor(supabase, persona);
  if (!actor) return { ok: false, error: 'تعذّر التحقق من هوية المستخدم في user_personas' };

  // جلب الـ gate (RLS يضمن العزل)
  const { data: gate } = await supabase
    .from('approval_gates')
    .select('id, status, required_role, assigned_to_persona_id, workflow_instance_id, school_id')
    .eq('id', input.gate_id)
    .single();

  if (!gate) {
    return { ok: false, error: 'الـ gate غير موجود أو لا تملك صلاحية الوصول إليه' };
  }

  if (gate.status !== 'pending') {
    return { ok: false, error: `لا يمكن اتخاذ قرار على gate بحالة "${gate.status}"` };
  }

  // التحقق من صلاحية الممثل
  const isAssigned      = gate.assigned_to_persona_id === actor.persona_id;
  const hasRequiredRole = gate.required_role === persona.role;
  const canDecide       = isAssigned || hasRequiredRole || (persona.isSystemOwner ?? false);

  if (!canDecide) {
    return { ok: false, error: 'ليس لديك صلاحية اتخاذ القرار على هذا الـ gate' };
  }

  // تسجيل القرار
  const { error: updateErr } = await supabase
    .from('approval_gates')
    .update({
      status:                  input.decision,
      selected_option:         input.selected_option ?? null,
      justification:           input.justification   ?? null,
      signature_hash:          input.signature_hash  ?? null,
      decided_by_persona_id:   actor.persona_id,
      decided_by_user_id:      persona.userId,
      decided_by_role_snapshot: persona.role,
      decided_by_name_snapshot: actor.full_name,
      decided_at:              new Date().toISOString(),
    })
    .eq('id', input.gate_id);

  if (updateErr) {
    return { ok: false, error: `فشل تسجيل القرار: ${updateErr.message}` };
  }

  return {
    ok: true,
    data: {
      gate_id:              input.gate_id,
      status:               input.decision,
      workflow_instance_id: gate.workflow_instance_id,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. createApprovalGate — مساعد لإنشاء gate صريح
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateApprovalGateInput {
  workflow_instance_id:    string;
  gate_name:               string;
  required_role:           string;
  assigned_to_persona_id?: string;
  decision_options?:       Record<string, unknown>;
  due_date?:               string;
  escalation_role?:        string;
}

export interface CreateApprovalGateOutput {
  gate_id: string;
}

/**
 * يُنشئ approval gate صريح مرتبط بـ workflow instance.
 * يُستدعى من كود المُنسِّق بعد كل advanceWorkflow يصل لحالة تتطلب قراراً بشرياً.
 */
export async function createApprovalGate(
  input: CreateApprovalGateInput
): Promise<WorkflowResult<CreateApprovalGateOutput>> {
  const persona = await getActivePersona();
  if (!persona)          return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!persona.schoolId) return { ok: false, error: 'يتطلب هذا الإجراء سياق مدرسة' };

  const supabase = await createSupabaseServerClient();

  // التحقق من وجود الـ instance ونشاطه (RLS يتحقق من school_id)
  const { data: instance } = await supabase
    .from('workflow_instances')
    .select('id, school_id, status')
    .eq('id', input.workflow_instance_id)
    .single();

  if (!instance) {
    return { ok: false, error: 'الـ workflow instance غير موجود' };
  }

  if (instance.status !== 'in_progress') {
    return { ok: false, error: 'لا يمكن إنشاء gate لـ workflow غير نشط' };
  }

  const { data: gate, error: gateErr } = await supabase
    .from('approval_gates')
    .insert({
      workflow_instance_id:  input.workflow_instance_id,
      school_id:             instance.school_id,
      gate_name:             input.gate_name,
      required_role:         input.required_role,
      assigned_to_persona_id: input.assigned_to_persona_id ?? null,
      assigned_role:         input.required_role,
      status:                'pending',
      is_delegated:          false,
      decision_options:      input.decision_options ?? null,
      due_date:              input.due_date          ?? null,
      escalation_role:       input.escalation_role   ?? null,
    })
    .select('id')
    .single();

  if (gateErr || !gate) {
    return { ok: false, error: `فشل إنشاء approval gate: ${gateErr?.message}` };
  }

  return { ok: true, data: { gate_id: gate.id } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getMyPendingGates — قراءة فقط
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingGateSummary {
  gate_id:             string;
  gate_name:           string;
  required_role:       string;
  workflow_instance_id: string;
  workflow_code:       string;
  due_date:            string | null;
  created_at:          string;
}

/**
 * يُعيد قائمة الـ approval gates المعلقة للمستخدم الحالي.
 * يُستخدم لبناء لوحة "بانتظار موافقتك".
 */
export async function getMyPendingGates(): Promise<WorkflowResult<PendingGateSummary[]>> {
  const persona = await getActivePersona();
  if (!persona)          return { ok: false, error: 'يرجى تسجيل الدخول' };
  if (!persona.schoolId) return { ok: false, error: 'يتطلب هذا الإجراء سياق مدرسة' };

  const supabase = await createSupabaseServerClient();

  const actor = await resolveActor(supabase, persona);
  if (!actor) return { ok: false, error: 'تعذّر التحقق من هوية المستخدم' };

  // RLS تُطبّق تلقائياً — نُضيف فلاتر إضافية للأداء
  const { data: gates, error } = await supabase
    .from('approval_gates')
    .select(`
      id,
      gate_name,
      required_role,
      workflow_instance_id,
      due_date,
      created_at,
      workflow_instances!inner ( workflow_code )
    `)
    .eq('status', 'pending')
    .eq('school_id', persona.schoolId)
    .or(
      `assigned_to_persona_id.eq.${actor.persona_id},required_role.eq.${persona.role}`
    )
    .order('created_at', { ascending: true });

  if (error) {
    return { ok: false, error: `فشل جلب الـ gates: ${error.message}` };
  }

  type GateRow = {
    id: string;
    gate_name: string;
    required_role: string;
    workflow_instance_id: string;
    due_date: string | null;
    created_at: string;
    workflow_instances: { workflow_code: string } | null;
  };
  const result: PendingGateSummary[] = ((gates ?? []) as unknown as GateRow[]).map(g => ({
    gate_id:              g.id,
    gate_name:            g.gate_name,
    required_role:        g.required_role,
    workflow_instance_id: g.workflow_instance_id,
    workflow_code:        g.workflow_instances?.workflow_code ?? '',
    due_date:             g.due_date,
    created_at:           g.created_at,
  }));

  return { ok: true, data: result };
}
