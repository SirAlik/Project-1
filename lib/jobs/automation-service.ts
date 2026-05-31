'use server';

/**
 * automation-service.ts
 *
 * محرك الأتمتة — يقرأ automation_rules ويُنفِّذ الإجراءات المرتبطة.
 *
 * يُستدعى من:
 *   • runFullFeed (analytics-feeder) بعد حساب الـ KPIs
 *   • /api/cron/daily-feed مباشرةً
 *
 * مبدأ الإيدمبوتنسية:
 *   • notification_queue لها UNIQUE على (source_module, source_id, recipient_id, template_key)
 *     — التكرار يُتجاهَل بصمت (ON CONFLICT DO NOTHING)
 *   • behavioral_referrals تُفحَص أولاً قبل الإنشاء لتجنب التكرار
 */

import { supabaseAdmin }       from '../db/supabase-admin';
import type { WorkflowResult } from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AutomationRule {
  id:            string;
  school_id:     string;
  name:          string;
  trigger_event: TriggerEvent;
  condition:     Record<string, unknown>;
  action:        ActionType;
  action_config: Record<string, unknown>;
}

type TriggerEvent =
  | 'absence_count'
  | 'period_absence'
  | 'late_count'
  | 'behavior_type'
  | 'loan_overdue'
  | 'health_referral';

type ActionType =
  | 'create_referral'
  | 'notify_role'
  | 'notify_parent'
  | 'create_case'
  | 'flag_risk';

export interface AutomationResult {
  rules_evaluated: number;
  actions_taken:   number;
  errors:          string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Action executors
// ─────────────────────────────────────────────────────────────────────────────

async function enqueueNotification(params: {
  schoolId:     string;
  recipientId?: string;
  recipientRole?: string;
  templateKey:  string;
  payload:      Record<string, unknown>;
  sourceModule: string;
  sourceId:     string;
}): Promise<void> {
  await supabaseAdmin
    .from('notification_queue')
    .insert({
      school_id:      params.schoolId,
      recipient_id:   params.recipientId   ?? null,
      recipient_role: params.recipientRole ?? null,
      channel:        'app',
      template_key:   params.templateKey,
      payload:        params.payload,
      source_module:  params.sourceModule,
      source_id:      params.sourceId,
      status:         'pending',
      scheduled_at:   new Date().toISOString(),
    })
    // التكرار يُتجاهَل — الـ UNIQUE constraint يمنعه
    .select();
}

async function createBehavioralReferral(params: {
  schoolId:    string;
  studentId:   string;
  vpPersonaId: string;
  reason:      string;
  count:       number;
  ruleId:      string;
}): Promise<string | null> {
  // منع التكرار: هل يوجد إحالة غياب نشطة لهذا الطالب مُنشأة من نفس القاعدة؟
  const { count: existing } = await supabaseAdmin
    .from('behavioral_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('school_id',  params.schoolId)
    .eq('student_id', params.studentId)
    .eq('referral_type', 'absence')
    .in('status', ['draft', 'pending_counselor', 'in_progress']);

  if ((existing ?? 0) > 0) return null; // مسبوقة

  const { data } = await supabaseAdmin
    .from('behavioral_referrals')
    .insert({
      school_id:             params.schoolId,
      student_id:            params.studentId,
      referred_by_persona_id: params.vpPersonaId,
      referral_type:         'absence',
      trigger_count:         params.count,
      vp_reason:             params.reason,
      status:                'draft',
    })
    .select('id')
    .single();

  return data?.id ?? null;
}

async function createCase(params: {
  schoolId:  string;
  studentId: string;
  title:     string;
  details:   string;
}): Promise<void> {
  // لا تُنشئ حالة مفتوحة مكررة لنفس الطالب
  const { count: existing } = await supabaseAdmin
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('school_id',  params.schoolId)
    .eq('student_id', params.studentId)
    .in('status', ['open', 'in_progress', 'مفتوحة', 'مفتوح']);

  if ((existing ?? 0) > 0) return;

  await supabaseAdmin.from('cases').insert({
    school_id:  params.schoolId,
    student_id: params.studentId,
    title:      params.title,
    details:    params.details,
    status:     'open',
  });
}

async function flagStudentRisk(params: {
  schoolId:    string;
  studentId:   string;
  riskLevel:   'low' | 'medium' | 'high';
  riskFactors: string[];
}): Promise<void> {
  // UPSERT — إذا وُجد flag نشط فيُحدَّث
  await supabaseAdmin
    .from('student_risk_flags')
    .upsert(
      {
        school_id:    params.schoolId,
        student_id:   params.studentId,
        risk_level:   params.riskLevel,
        risk_factors: params.riskFactors,
        detected_at:  new Date().toISOString(),
        resolved_at:  null,
      },
      { onConflict: 'school_id,student_id' },
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger evaluators — واحد لكل trigger_event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * absence_count / late_count
 * يجمع غيابات/تأخرات كل طالب ويُطبّق الإجراء على من تجاوز الحد.
 */
async function evalAttendanceRule(
  rule:     AutomationRule,
  yearId:   string | null,
): Promise<number> {
  const threshold = (rule.condition.threshold as number | null) ?? 3;
  const period    = (rule.condition.period    as string | null) ?? 'academic_year';
  const statusFilter = rule.trigger_event === 'absence_count' ? 'absent' : 'late';

  // نطاق التاريخ
  let fromDate: string | null = null;
  if (period === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 6);
    fromDate = d.toISOString().slice(0, 10);
  } else if (period === 'month') {
    const d = new Date(); d.setDate(d.getDate() - 29);
    fromDate = d.toISOString().slice(0, 10);
  }

  let query = supabaseAdmin
    .from('student_daily_attendance')
    .select('student_id')
    .eq('school_id', rule.school_id)
    .eq('status',    statusFilter);

  if (fromDate) query = query.gte('attendance_date', fromDate);
  if (period === 'academic_year' && yearId) query = query.eq('academic_year_id', yearId);

  const { data: records } = await query;

  // تجميع بالطالب
  const countMap: Record<string, number> = {};
  (records ?? []).forEach(r => {
    countMap[r.student_id] = (countMap[r.student_id] ?? 0) + 1;
  });

  // الطلاب الذين تجاوزوا الحد
  const violators = Object.entries(countMap)
    .filter(([, c]) => c >= threshold)
    .map(([id, c]) => ({ studentId: id, count: c }));

  if (!violators.length) return 0;

  // جلب أي persona لـ student_affairs_vp في المدرسة (للإحالة)
  const { data: vpPersona } = await supabaseAdmin
    .from('user_personas')
    .select('id')
    .eq('school_id', rule.school_id)
    .eq('role', 'student_affairs_vp')
    .limit(1)
    .maybeSingle();

  let acted = 0;
  await Promise.all(violators.map(async ({ studentId, count }) => {
    try {
      if (rule.action === 'create_referral' && vpPersona?.id) {
        await createBehavioralReferral({
          schoolId:    rule.school_id,
          studentId,
          vpPersonaId: vpPersona.id as string,
          reason:      `تجاوز حد ${statusFilter === 'absent' ? 'الغياب' : 'التأخر'}: ${count} مرة`,
          count,
          ruleId:      rule.id,
        });
        acted++;
      }

      if (rule.action === 'notify_role') {
        const role = (rule.action_config.role as string | null) ?? 'student_affairs_vp';
        await enqueueNotification({
          schoolId:      rule.school_id,
          recipientRole: role,
          templateKey:   statusFilter === 'absent' ? 'absence_threshold_alert' : 'late_threshold_alert',
          payload:       { student_id: studentId, count, threshold, rule_name: rule.name },
          sourceModule:  'attendance',
          sourceId:      studentId,
        });
        acted++;
      }

      if (rule.action === 'flag_risk') {
        const level = count >= threshold * 2 ? 'high' : 'medium';
        await flagStudentRisk({
          schoolId:    rule.school_id,
          studentId,
          riskLevel:   level,
          riskFactors: [`${statusFilter}_threshold_exceeded`],
        });
        acted++;
      }
    } catch { /* نتابع بقية الطلاب */ }
  }));

  return acted;
}

/**
 * loan_overdue — يُنشئ إشعار تأخر إعادة كتاب
 */
async function evalLoanOverdueRule(rule: AutomationRule): Promise<number> {
  const days = (rule.condition.days as number | null) ?? 3;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: loans } = await supabaseAdmin
    .from('lrc_loans')
    .select('id, borrower_id, borrower_type')
    .eq('school_id', rule.school_id)
    .eq('status', 'active')
    .lte('due_date', cutoffDate);

  if (!loans?.length) return 0;

  let acted = 0;
  await Promise.all(loans.map(async loan => {
    try {
      if (rule.action === 'notify_parent' || rule.action === 'notify_role') {
        const role = (rule.action_config.role as string | null) ?? 'student_affairs_vp';
        await enqueueNotification({
          schoolId:      rule.school_id,
          recipientRole: rule.action === 'notify_role' ? role : undefined,
          templateKey:   'loan_overdue_reminder',
          payload:       { borrower_id: loan.borrower_id, borrower_type: loan.borrower_type, loan_id: loan.id },
          sourceModule:  'lrc',
          sourceId:      loan.id as string,
        });
        acted++;
      }
    } catch { /* نتابع */ }
  }));

  return acted;
}

/**
 * health_referral — يُشعر عند وجود إحالة صحية جديدة
 */
async function evalHealthReferralRule(rule: AutomationRule): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: referrals } = await supabaseAdmin
    .from('health_referrals')
    .select('id, student_id')
    .eq('school_id', rule.school_id)
    .gte('created_at', `${today}T00:00:00Z`);

  if (!referrals?.length) return 0;

  let acted = 0;
  await Promise.all(referrals.map(async ref => {
    try {
      const role = (rule.action_config.role as string | null) ?? 'school_principal';
      await enqueueNotification({
        schoolId:      rule.school_id,
        recipientRole: role,
        templateKey:   'health_referral_today',
        payload:       { student_id: ref.student_id, referral_id: ref.id },
        sourceModule:  'health',
        sourceId:      ref.id as string,
      });
      acted++;
    } catch { /* نتابع */ }
  }));

  return acted;
}

/**
 * period_absence — يُطبِّق القاعدة على الطلاب الذين تجاوزوا عدد حصص الغياب اليومي
 */
async function evalPeriodAbsenceRule(
  rule:   AutomationRule,
  yearId: string | null,
): Promise<number> {
  const threshold = (rule.condition.threshold as number | null) ?? 3;
  const today     = new Date().toISOString().slice(0, 10);

  let query = supabaseAdmin
    .from('period_attendance')
    .select('student_id')
    .eq('school_id', rule.school_id)
    .eq('status',    'absent')
    .eq('date',      today);

  if (yearId) query = query.eq('academic_year_id', yearId);

  const { data: records } = await query;

  const countMap: Record<string, number> = {};
  (records ?? []).forEach(r => {
    countMap[r.student_id] = (countMap[r.student_id] ?? 0) + 1;
  });

  const violators = Object.entries(countMap)
    .filter(([, c]) => c >= threshold)
    .map(([id, c]) => ({ studentId: id, count: c }));

  if (!violators.length) return 0;

  const { data: vpPersona } = await supabaseAdmin
    .from('user_personas')
    .select('id')
    .eq('school_id', rule.school_id)
    .eq('role', 'student_affairs_vp')
    .limit(1)
    .maybeSingle();

  let acted = 0;
  await Promise.all(violators.map(async ({ studentId, count }) => {
    try {
      if (rule.action === 'create_referral' && vpPersona?.id) {
        await createBehavioralReferral({
          schoolId:    rule.school_id,
          studentId,
          vpPersonaId: vpPersona.id as string,
          reason:      `غياب ${count} حصة في يوم واحد`,
          count,
          ruleId:      rule.id,
        });
        acted++;
      }
      if (rule.action === 'notify_role') {
        const role = (rule.action_config.role as string | null) ?? 'student_affairs_vp';
        await enqueueNotification({
          schoolId:      rule.school_id,
          recipientRole: role,
          templateKey:   'period_absence_alert',
          payload:       { student_id: studentId, count, threshold, rule_name: rule.name },
          sourceModule:  'period_attendance',
          sourceId:      studentId,
        });
        acted++;
      }
      if (rule.action === 'flag_risk') {
        await flagStudentRisk({
          schoolId:    rule.school_id,
          studentId,
          riskLevel:   count >= threshold * 2 ? 'high' : 'medium',
          riskFactors: ['period_absence_threshold_exceeded'],
        });
        acted++;
      }
    } catch { /* نتابع بقية الطلاب */ }
  }));

  return acted;
}

/**
 * behavior_type — يُشعر عند تكرار مخالفة سلوكية
 */
async function evalBehaviorRule(rule: AutomationRule): Promise<number> {
  const threshold = (rule.condition.threshold as number | null) ?? 3;

  const { data: refs } = await supabaseAdmin
    .from('behavioral_referrals')
    .select('student_id')
    .eq('school_id',    rule.school_id)
    .eq('referral_type', 'behavior');

  const countMap: Record<string, number> = {};
  (refs ?? []).forEach(r => { countMap[r.student_id] = (countMap[r.student_id] ?? 0) + 1; });

  const violators = Object.entries(countMap).filter(([, c]) => c >= threshold);
  if (!violators.length) return 0;

  let acted = 0;
  await Promise.all(violators.map(async ([studentId]) => {
    try {
      if (rule.action === 'create_case') {
        await createCase({
          schoolId:  rule.school_id,
          studentId,
          title:     `سلوك متكرر — ${rule.name}`,
          details:   `فُتحت آلياً بتجاوز ${threshold} إحالات سلوكية`,
        });
        acted++;
      }
      if (rule.action === 'flag_risk') {
        await flagStudentRisk({
          schoolId:    rule.school_id,
          studentId,
          riskLevel:   'high',
          riskFactors: ['repeated_behavior'],
        });
        acted++;
      }
    } catch { /* نتابع */ }
  }));

  return acted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُشغِّل جميع القواعد النشطة لمدرسة.
 * الاستدعاء: بعد runDailyFeed مباشرةً، أو مستقلاً.
 */
export async function runAutomationEngine(
  schoolId: string,
): Promise<WorkflowResult<AutomationResult>> {
  // جلب القواعد النشطة
  const { data: rules, error: rErr } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_active', true);

  if (rErr) return { ok: false, error: rErr.message };
  if (!rules?.length) return { ok: true, data: { rules_evaluated: 0, actions_taken: 0, errors: [] } };

  // السنة الدراسية النشطة
  const { data: yearRow } = await supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const yearId = (yearRow?.id as string | null) ?? null;

  const errors: string[] = [];
  let totalActions = 0;

  await Promise.all((rules as AutomationRule[]).map(async rule => {
    try {
      let acted = 0;

      switch (rule.trigger_event) {
        case 'absence_count':
        case 'late_count':
          acted = await evalAttendanceRule(rule, yearId);
          break;
        case 'period_absence':
          acted = await evalPeriodAbsenceRule(rule, yearId);
          break;
        case 'behavior_type':
          acted = await evalBehaviorRule(rule);
          break;
        case 'loan_overdue':
          acted = await evalLoanOverdueRule(rule);
          break;
        case 'health_referral':
          acted = await evalHealthReferralRule(rule);
          break;
      }

      totalActions += acted;
    } catch (err) {
      errors.push(`rule ${rule.id} (${rule.name}): ${String(err)}`);
    }
  }));

  return {
    ok: true,
    data: {
      rules_evaluated: rules.length,
      actions_taken:   totalActions,
      errors,
    },
  };
}
