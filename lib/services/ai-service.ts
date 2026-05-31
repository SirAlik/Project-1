'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { supabaseAdmin }              from '../db/supabase-admin';
import type { WorkflowResult }        from '../workflow-service';
import type {
  AIContextType,
  AIRoleTarget,
  AIScope,
  AIInsight,
  AIPromptTemplate,
} from '../types/ai';

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

type PayloadData = Record<string, string | number | null>;

interface ClaudeMessage {
  summary_ar:      string;
  recommendations: Array<{ title: string; action: string; priority?: 'high' | 'medium' | 'low' }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt rendering
// ─────────────────────────────────────────────────────────────────────────────

// يستبدل {{key}} بالقيم — القيمة null تصبح 'غير متوفر'
function renderPrompt(templateText: string, data: PayloadData): string {
  return templateText.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val === null || val === undefined ? 'غير متوفر' : String(val);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone helper
// ─────────────────────────────────────────────────────────────────────────────

// يُعيد YYYY-MM-DD بتوقيت المدرسة (en-CA يُنتج هذا الشكل دائماً)
function getTodayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone:  tz,
    year:      'numeric',
    month:     '2-digit',
    day:       '2-digit',
  }).format(new Date());
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload builders — واحد لكل context_type
// كل دالة تجمع بيانات من daily_kpis أو student_analytics_cache.
// تُرجع null لأي قيمة غير متوفرة — renderPrompt يتعامل معها بـ 'غير متوفر'.
// ─────────────────────────────────────────────────────────────────────────────

async function buildSchoolOverviewPayload(
  schoolId: string,
  date:     string,
): Promise<PayloadData> {
  const { data: kpi } = await supabaseAdmin
    .from('daily_kpis')
    .select('metrics')
    .eq('school_id', schoolId)
    .eq('date', date)
    .eq('role', 'school_principal')
    .maybeSingle();

  const { count: highRiskCount } = await supabaseAdmin
    .from('student_analytics_cache')
    .select('student_id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('risk_level', 'high');

  const m = (kpi?.metrics ?? {}) as Record<string, unknown>;
  return {
    attendance_rate:  (m.attendance_rate   as number | null) ?? null,
    behavioral_count: (m.behavioral_today  as number | null) ?? null,
    lrc_visits:       (m.lrc_visits_today  as number | null) ?? null,
    health_cases:     (m.health_cases_today as number | null) ?? null,
    high_risk_count:  highRiskCount ?? 0,
  };
}

async function buildAttendanceAnalysisPayload(
  schoolId: string,
  date:     string,
): Promise<PayloadData> {
  const { data: kpi } = await supabaseAdmin
    .from('daily_kpis')
    .select('metrics')
    .eq('school_id', schoolId)
    .eq('date', date)
    .eq('role', 'student_affairs_vp')
    .maybeSingle();

  // معدل الغياب الأسبوعي: آخر 7 أيام
  const from = new Date(date);
  from.setDate(from.getDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);

  const { data: weekKpis } = await supabaseAdmin
    .from('daily_kpis')
    .select('metrics')
    .eq('school_id', schoolId)
    .eq('role', 'student_affairs_vp')
    .gte('date', fromDate)
    .lte('date', date);

  let totalAbsent = 0;
  let totalStudentDays = 0;
  for (const row of weekKpis ?? []) {
    const wm = (row.metrics ?? {}) as Record<string, unknown>;
    totalAbsent      += (wm.absent_today   as number | null) ?? 0;
    totalStudentDays += ((wm.absent_today  as number | null) ?? 0)
                      + ((wm.present_today as number | null) ?? 0);
  }
  const weekRate = totalStudentDays > 0
    ? Math.round((totalAbsent / totalStudentDays) * 100)
    : null;

  // طلاب تجاوزوا 5 غيابات منذ بداية السنة
  const { count: thresholdStudents } = await supabaseAdmin
    .from('student_analytics_cache')
    .select('student_id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .gte('total_absences_ytd', 5);

  const m = (kpi?.metrics ?? {}) as Record<string, unknown>;
  return {
    absent_today:       (m.absent_today  as number | null) ?? null,
    late_today:         (m.late_today    as number | null) ?? null,
    week_absence_rate:  weekRate,
    threshold_students: thresholdStudents ?? 0,
  };
}

async function buildStudentProfilePayload(
  studentId: string,
): Promise<PayloadData> {
  // أحدث سجل في الكاش لهذا الطالب (مرتب بـ updated_at)
  const { data: cache } = await supabaseAdmin
    .from('student_analytics_cache')
    .select('total_absences_ytd, behavior_incidents_ytd, referrals_ytd, risk_level')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const referralSummary = cache?.referrals_ytd
    ? `${cache.referrals_ytd} إحالة`
    : 'لا توجد إحالات';

  return {
    total_absences:     cache?.total_absences_ytd     ?? null,
    behavior_incidents: cache?.behavior_incidents_ytd ?? null,
    referral_types:     referralSummary,
    risk_level:         cache?.risk_level             ?? 'غير محدد',
  };
}

async function buildLrcUsagePayload(
  schoolId: string,
  date:     string,
): Promise<PayloadData> {
  const { data: kpi } = await supabaseAdmin
    .from('daily_kpis')
    .select('metrics')
    .eq('school_id', schoolId)
    .eq('date', date)
    .eq('role', 'school_librarian')
    .maybeSingle();

  const m = (kpi?.metrics ?? {}) as Record<string, unknown>;
  return {
    active_loans:   (m.loans_active  as number | null) ?? null,
    overdue_count:  (m.overdue_count as number | null) ?? null,
    class_visits:   (m.visits_today  as number | null) ?? null,
    top_categories: 'تتطلب feeder يومي',
  };
}

async function buildHealthTrendPayload(
  schoolId: string,
  date:     string,
): Promise<PayloadData> {
  const { data: kpi } = await supabaseAdmin
    .from('daily_kpis')
    .select('metrics')
    .eq('school_id', schoolId)
    .eq('date', date)
    .eq('role', 'health_coordinator')
    .maybeSingle();

  // أكثر الشكاوى تكراراً من health_visits (آخر 7 أيام)
  const from = new Date(date);
  from.setDate(from.getDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);

  const { data: visits } = await supabaseAdmin
    .from('health_visits')
    .select('complaint')
    .eq('school_id', schoolId)
    .gte('date', fromDate)
    .not('complaint', 'is', null);

  const freq: Record<string, number> = {};
  for (const v of visits ?? []) {
    if (v.complaint) freq[v.complaint] = (freq[v.complaint] ?? 0) + 1;
  }
  const topComplaints = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([c]) => c)
    .join(' / ') || null;

  const m = (kpi?.metrics ?? {}) as Record<string, unknown>;
  return {
    visits_week:        (m.visits_today    as number | null) ?? null,
    top_complaints:     topComplaints,
    hospital_referrals: (m.referrals_today as number | null) ?? null,
    emergency_count:    (m.emergency_count as number | null) ?? null,
  };
}

// سيناريوهات لم تُبنَ لها payload builders بعد — ترجع فارغة
function buildEmptyPayload(): PayloadData {
  return {};
}

async function buildPayload(
  schoolId:    string,
  contextType: AIContextType,
  _scope:      AIScope,
  scopeId:     string,
  date:        string,
): Promise<PayloadData> {
  switch (contextType) {
    case 'school_overview':     return buildSchoolOverviewPayload(schoolId, date);
    case 'attendance_analysis': return buildAttendanceAnalysisPayload(schoolId, date);
    case 'student_profile':     return buildStudentProfilePayload(scopeId);
    case 'lrc_usage':           return buildLrcUsagePayload(schoolId, date);
    case 'health_trend':        return buildHealthTrendPayload(schoolId, date);
    default:                    return buildEmptyPayload();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude API
// ─────────────────────────────────────────────────────────────────────────────

// يطلب من Claude ردّاً بـ JSON صالح دائماً
const SYSTEM_PROMPT = `أنت مستشار تعليمي متخصص.
رد دائماً بـ JSON صالح بهذا الشكل بالضبط، بدون أي نص خارج الـ JSON:
{"summary_ar":"...","recommendations":[{"title":"...","action":"...","priority":"high"},{"title":"...","action":"...","priority":"medium"}]}
القيم المقبولة لـ priority: "high" أو "medium" أو "low".`;

async function callClaudeAPI(
  prompt:       string,
  maxTokens:    number,
  modelVersion: string,
): Promise<ClaudeMessage | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ai-service] ANTHROPIC_API_KEY غير مضبوطة');
    return null;
  }

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      modelVersion,
        max_tokens: maxTokens,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    console.error('[ai-service] شبكة Claude:', err);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[ai-service] Claude ${res.status}:`, body.slice(0, 300));
    return null;
  }

  const json = await res.json() as { content: Array<{ type: string; text: string }> };
  const raw  = json.content?.[0]?.text ?? '';

  try {
    return JSON.parse(raw) as ClaudeMessage;
  } catch {
    // محاولة استخراج الـ JSON إن كان محاطاً بنص
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]) as ClaudeMessage; } catch {}
    }
    console.error('[ai-service] فشل parsing رد Claude:', raw.slice(0, 200));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يجلب رؤية محفوظة وغير منتهية لدور المستخدم الحالي.
 * data = null إذا لم توجد رؤية صالحة.
 */
export async function getInsightForRole(
  contextType: AIContextType,
  scope:       AIScope,
  scopeId:     string,
): Promise<WorkflowResult<AIInsight | null>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('school_id',    persona.schoolId)
    .eq('scope',        scope)
    .eq('scope_id',     scopeId)
    .eq('role_target',  persona.role)
    .eq('context_type', contextType)
    .gt('expires_at',   new Date().toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as AIInsight | null };
}

/**
 * كاش أولاً — يُعيد رؤية محفوظة أو يُولّد واحدة جديدة.
 */
export async function getOrGenerateInsight(
  contextType: AIContextType,
  scope:       AIScope,
  scopeId:     string,
): Promise<WorkflowResult<AIInsight>> {
  const cached = await getInsightForRole(contextType, scope, scopeId);
  if (cached.ok && cached.data) return { ok: true, data: cached.data };

  return generateInsight(contextType, scope, scopeId);
}

/**
 * يُولّد رؤية جديدة متجاوزاً الكاش.
 * مُصدَّرة لاستخدامها من cron أو اختبارات يدوية.
 */
export async function generateInsight(
  contextType: AIContextType,
  scope:       AIScope,
  scopeId:     string,
): Promise<WorkflowResult<AIInsight>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const roleTarget = persona.role as AIRoleTarget;
  const schoolId   = persona.schoolId;

  // 1. timezone المدرسة → generated_date بتوقيتها
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('timezone')
    .eq('id', schoolId)
    .maybeSingle();

  const timezone      = (school?.timezone as string | null) ?? 'Asia/Riyadh';
  const generatedDate = getTodayInTimezone(timezone);

  // 2. جلب السنة الدراسية النشطة (اختياري — يُخزَّن في ai_insights)
  const { data: yearRow } = await supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  // 3. جلب القالب المناسب
  const { data: template, error: tErr } = await supabaseAdmin
    .from('ai_prompt_templates')
    .select('*')
    .eq('role_target',  roleTarget)
    .eq('context_type', contextType)
    .eq('is_active',    true)
    .maybeSingle();

  if (tErr || !template) {
    return { ok: false, error: `لا يوجد قالب نشط لـ ${roleTarget} / ${contextType}` };
  }

  const tmpl = template as AIPromptTemplate;

  // 4. بناء الـ payload من الكاش
  let payload: PayloadData = {};
  try {
    payload = await buildPayload(schoolId, contextType, scope, scopeId, generatedDate);
  } catch (err) {
    console.error('[ai-service] buildPayload خطأ:', err);
  }

  // 5. تصيير الـ prompt وإرساله لـ Claude
  const rendered      = renderPrompt(tmpl.template_text, payload);
  const MODEL = 'claude-sonnet-4-6';
  const claudeResult  = await callClaudeAPI(rendered, tmpl.max_tokens, MODEL);

  if (!claudeResult) {
    return { ok: false, error: 'فشل توليد الرؤية من Claude API' };
  }

  // 6. UPSERT في ai_insights (يُحدِّث لو الدور + السياق + اليوم موجود مسبقاً)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const row = {
    school_id:        schoolId,
    scope,
    scope_id:         scopeId,
    role_target:      roleTarget,
    context_type:     contextType,
    summary_ar:       claudeResult.summary_ar,
    recommendations:  claudeResult.recommendations,
    data_snapshot:    payload,
    generated_at:     new Date().toISOString(),
    generated_date:   generatedDate,
    expires_at:       expiresAt,
    academic_year_id: yearRow?.id ?? null,
    model_version:    MODEL,
  };

  const { data: saved, error: insErr } = await supabaseAdmin
    .from('ai_insights')
    .upsert(row, {
      onConflict: 'school_id,scope,scope_id,role_target,context_type,generated_date',
    })
    .select()
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true, data: saved as AIInsight };
}

/**
 * جلب كل الرؤى النشطة لدور المستخدم الحالي (للـ dashboard).
 */
export async function getAllInsightsForRole(): Promise<WorkflowResult<AIInsight[]>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('school_id',   persona.schoolId)
    .eq('role_target', persona.role)
    .gt('expires_at',  new Date().toISOString())
    .order('generated_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AIInsight[] };
}
