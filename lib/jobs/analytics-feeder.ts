'use server';

/**
 * analytics-feeder.ts
 *
 * يحسب KPIs من المصادر الحية ويكتبها في جداول الكاش:
 *   • daily_kpis            — مؤشرات يومية لكل دور
 *   • class_weekly_summary  — ملخص أسبوعي لكل شعبة
 *   • student_analytics_cache — مؤشرات تراكمية لكل طالب
 *
 * يستخدم supabaseAdmin (service_role) — لا يُستدعى من client-side.
 * مُصمَّم للاستدعاء من:
 *   • Server Action يدوي (مدير)
 *   • Supabase Edge Function (cron يومي)
 */

import { supabaseAdmin }       from '../db/supabase-admin';
import { getActivePersona }    from '../auth/context-service';
import { hasPermission }       from '../auth/pbac';
import type { WorkflowResult } from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedSummary {
  date:           string;
  roles_computed: number;
  errors:         string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getTodayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// أول يوم (أحد) للأسبوع الذي يقع فيه التاريخ المُعطى
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// بداية ونهاية الأسبوع الدراسي (أحد–خميس)
function weekRange(weekStart: string): { from: string; to: string } {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return { from: weekStart, to: end.toISOString().slice(0, 10) };
}


// ─────────────────────────────────────────────────────────────────────────────
// KPI Computers — واحد لكل دور
// ─────────────────────────────────────────────────────────────────────────────

async function computePrincipalKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: totalToday },
    { count: absentToday },
    { count: lateToday },
    { count: behavioralToday },
    { count: healthToday },
    { count: lrcVisitsToday },
  ] = await Promise.all([
    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date),

    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date).eq('status', 'absent'),

    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date).eq('status', 'late'),

    supabaseAdmin.from('behavioral_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lt('created_at',  `${date}T23:59:59Z`),

    supabaseAdmin.from('health_visits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('date', date),

    supabaseAdmin.from('lrc_visits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('visit_date', date),
  ]);

  const total = totalToday ?? 0;
  const absent = absentToday ?? 0;
  const present = total - absent;

  return {
    attendance_rate:    total > 0 ? Math.round((present / total) * 100) : null,
    absent_count:       absent,
    late_count:         lateToday ?? 0,
    behavioral_today:   behavioralToday ?? 0,
    health_cases_today: healthToday ?? 0,
    lrc_visits_today:   lrcVisitsToday ?? 0,
    present_today:      present,
  };
}

async function computeStudentAffairsKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: absentToday },
    { count: lateToday },
    { count: exitsToday },
    { count: behavioralRefsNew },
    { count: contractsPending },
    { count: presentToday },
  ] = await Promise.all([
    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date).eq('status', 'absent'),

    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date).eq('status', 'late'),

    supabaseAdmin.from('classroom_exits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('exit_date', date),

    supabaseAdmin.from('behavioral_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lt('created_at',  `${date}T23:59:59Z`),

    supabaseAdmin.from('behavioral_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .is('parent_signed_at', null),

    supabaseAdmin.from('student_daily_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('attendance_date', date).eq('status', 'present'),
  ]);

  return {
    absent_today:        absentToday    ?? 0,
    late_today:          lateToday      ?? 0,
    exits_today:         exitsToday     ?? 0,
    behavioral_refs_new: behavioralRefsNew ?? 0,
    contracts_pending:   contractsPending  ?? 0,
    present_today:       presentToday   ?? 0,
  };
}

async function computeHealthKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: visitsToday },
    { count: referralsToday },
    { count: suppliesLow },
    { count: emergencyToday },
  ] = await Promise.all([
    supabaseAdmin.from('health_visits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('date', date),

    supabaseAdmin.from('health_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lt('created_at',  `${date}T23:59:59Z`),

    // مخزون أقل من 5 وحدات يُعدّ منخفضاً
    supabaseAdmin.from('health_supplies')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).lte('quantity', 5),

    supabaseAdmin.from('health_visits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('date', date).eq('triage_level', 'emergency'),
  ]);

  return {
    visits_today:       visitsToday    ?? 0,
    referrals_today:    referralsToday ?? 0,
    supplies_low_count: suppliesLow    ?? 0,
    emergency_count:    emergencyToday ?? 0,
    canteen_checked:    0, // يُملأ يدوياً من الواجهة
  };
}

async function computeLibrarianKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: loansActive },
    { count: overdueCount },
    { count: visitsToday },
    { count: bookingsPending },
  ] = await Promise.all([
    supabaseAdmin.from('lrc_loans')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('status', 'active'),

    supabaseAdmin.from('lrc_loans')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('status', 'overdue'),

    supabaseAdmin.from('lrc_visits')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('visit_date', date),

    supabaseAdmin.from('lrc_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('status', 'pending'),
  ]);

  return {
    loans_active:     loansActive     ?? 0,
    overdue_count:    overdueCount    ?? 0,
    visits_today:     visitsToday     ?? 0,
    bookings_pending: bookingsPending ?? 0,
  };
}

async function computeCounselorKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: casesOpen },
    { count: sessionsToday },
    { count: referralsPending },
    { count: riskHighCount },
  ] = await Promise.all([
    supabaseAdmin.from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .in('status', ['open', 'مفتوحة', 'مفتوح', 'in_progress', 'new']),

    supabaseAdmin.from('counselor_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('session_date', date),

    supabaseAdmin.from('behavioral_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('status', 'pending_counselor'),

    supabaseAdmin.from('student_risk_flags')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('risk_level', 'high').is('resolved_at', null),
  ]);

  return {
    cases_open:         casesOpen        ?? 0,
    sessions_today:     sessionsToday    ?? 0,
    referrals_pending:  referralsPending ?? 0,
    risk_high_count:    riskHighCount    ?? 0,
  };
}

async function computeQualityKPIs(
  schoolId: string,
  date:     string,
): Promise<Record<string, number | null>> {
  const [
    { count: evidenceToday },
    { count: rubricsActive },
    { count: indicatorsTotal },
  ] = await Promise.all([
    supabaseAdmin.from('quality_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('evidence_date', date),

    supabaseAdmin.from('qa_rubrics')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true),

    supabaseAdmin.from('quality_indicators')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId).eq('is_active', true),
  ]);

  // مؤشرات دون الهدف: يحتاج مقارنة evidence بـ indicators.target_value
  // — يُحسب لاحقاً عند توفر بيانات كافية
  return {
    evidence_today:          evidenceToday  ?? 0,
    rubrics_active:          rubricsActive  ?? 0,
    indicators_total:        indicatorsTotal ?? 0,
    indicators_below_target: null,
    observations_this_week:  null, // qa_observations غير متاحة بعد
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. runDailyFeed — يُحدِّث daily_kpis لتاريخ اليوم
// ─────────────────────────────────────────────────────────────────────────────

export async function runDailyFeed(
  schoolId: string,
): Promise<WorkflowResult<FeedSummary>> {
  // جلب timezone المدرسة
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('timezone')
    .eq('id', schoolId)
    .maybeSingle();

  const tz   = (school?.timezone as string | null) ?? 'Asia/Riyadh';
  const date = getTodayInTimezone(tz);

  const errors: string[] = [];
  let computed = 0;

  // كل دور وحاسبته المقابلة
  const roles: Array<{
    role:    string;
    compute: (sid: string, d: string) => Promise<Record<string, number | null>>;
  }> = [
    { role: 'school_principal',   compute: computePrincipalKPIs },
    { role: 'student_affairs_vp', compute: computeStudentAffairsKPIs },
    { role: 'health_coordinator', compute: computeHealthKPIs },
    { role: 'school_librarian',   compute: computeLibrarianKPIs },
    { role: 'student_counselor',  compute: computeCounselorKPIs },
    { role: 'quality_coordinator',compute: computeQualityKPIs },
  ];

  await Promise.all(roles.map(async ({ role, compute }) => {
    try {
      const metrics = await compute(schoolId, date);
      const { error } = await supabaseAdmin
        .from('daily_kpis')
        .upsert(
          {
            school_id:   schoolId,
            date,
            role,
            metrics,
            computed_at: new Date().toISOString(),
          },
          { onConflict: 'school_id,date,role' },
        );

      if (error) {
        errors.push(`${role}: ${error.message}`);
      } else {
        computed++;
      }
    } catch (err) {
      errors.push(`${role}: ${String(err)}`);
    }
  }));

  return {
    ok: true,
    data: { date, roles_computed: computed, errors },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. runWeeklySummaryFeed — يُحدِّث class_weekly_summary لأسبوع محدد
// ─────────────────────────────────────────────────────────────────────────────

export async function runWeeklySummaryFeed(
  schoolId:  string,
  weekStart: string,
): Promise<WorkflowResult<{ classes_updated: number; errors: string[] }>> {
  const { from: weekFrom, to: weekTo } = weekRange(weekStart);

  // جلب كل الشعب في المدرسة
  const { data: classes, error: clsErr } = await supabaseAdmin
    .from('classes')
    .select('id')
    .eq('school_id', schoolId);

  if (clsErr) return { ok: false, error: clsErr.message };
  if (!classes?.length) return { ok: true, data: { classes_updated: 0, errors: [] } };

  // السنة الدراسية النشطة
  const { data: yearRow } = await supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const errors: string[] = [];
  let updated = 0;

  await Promise.all(classes.map(async ({ id: classId }) => {
    try {
      const [
        { count: totalAbsences },
        { count: totalLates },
        { count: totalExits },
        { count: behaviorIncidents },
        { count: referralsCount },
        { count: lrcVisits },
        { count: healthCases },
      ] = await Promise.all([
        supabaseAdmin.from('student_daily_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('class_id', classId)
          .eq('status', 'absent')
          .gte('attendance_date', weekFrom).lte('attendance_date', weekTo),

        supabaseAdmin.from('student_daily_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('class_id', classId)
          .eq('status', 'late')
          .gte('attendance_date', weekFrom).lte('attendance_date', weekTo),

        supabaseAdmin.from('classroom_exits')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('class_id', classId)
          .gte('exit_date', weekFrom).lte('exit_date', weekTo),

        supabaseAdmin.from('behavioral_referrals')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .gte('created_at', `${weekFrom}T00:00:00Z`)
          .lte('created_at', `${weekTo}T23:59:59Z`),

        supabaseAdmin.from('behavioral_referrals')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .gte('created_at', `${weekFrom}T00:00:00Z`)
          .lte('created_at', `${weekTo}T23:59:59Z`),

        supabaseAdmin.from('lrc_visits')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('class_id', classId)
          .gte('visit_date', weekFrom).lte('visit_date', weekTo),

        supabaseAdmin.from('health_visits')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId).eq('class_id', classId)
          .gte('date', weekFrom).lte('date', weekTo),
      ]);

      const { error } = await supabaseAdmin
        .from('class_weekly_summary')
        .upsert(
          {
            school_id:          schoolId,
            class_id:           classId,
            academic_year_id:   yearRow?.id ?? null,
            week_start:         weekStart,
            total_absences:     totalAbsences  ?? 0,
            total_lates:        totalLates     ?? 0,
            total_exits:        totalExits     ?? 0,
            behavior_incidents: behaviorIncidents ?? 0,
            referrals_count:    referralsCount ?? 0,
            lrc_visits:         lrcVisits      ?? 0,
            health_cases:       healthCases    ?? 0,
            computed_at:        new Date().toISOString(),
          },
          { onConflict: 'school_id,class_id,week_start' },
        );

      if (error) errors.push(`class ${classId}: ${error.message}`);
      else updated++;
    } catch (err) {
      errors.push(`class ${classId}: ${String(err)}`);
    }
  }));

  return { ok: true, data: { classes_updated: updated, errors } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. runStudentCacheFeed — يُحدِّث student_analytics_cache لسنة دراسية
// ─────────────────────────────────────────────────────────────────────────────

export async function runStudentCacheFeed(
  schoolId:       string,
  academicYearId: string,
): Promise<WorkflowResult<{ students_updated: number; errors: string[] }>> {
  // جلب كل الطلاب المسجلين في هذه السنة
  const { data: enrollments, error: enrErr } = await supabaseAdmin
    .from('student_enrollments')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .eq('is_active', true);

  if (enrErr) return { ok: false, error: enrErr.message };
  if (!enrollments?.length) return { ok: true, data: { students_updated: 0, errors: [] } };

  const studentIds = [...new Set(enrollments.map(e => e.student_id as string))];

  // ─── جلب بيانات مجمَّعة لكل الطلاب دفعةً واحدة ───────────────────────────

  // غيابات غير مبررة
  const { data: absenceRecs } = await supabaseAdmin
    .from('period_attendance')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'absent')
    .eq('is_excused', false)
    .in('student_id', studentIds);

  // تأخرات
  const { data: lateRecs } = await supabaseAdmin
    .from('period_attendance')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'late')
    .in('student_id', studentIds);

  // إجمالي الحضور (للنسبة المئوية)
  const { data: totalRecs } = await supabaseAdmin
    .from('period_attendance')
    .select('student_id, status')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .in('student_id', studentIds);

  // مغادرات الفصل
  const { data: exitRecs } = await supabaseAdmin
    .from('classroom_exits')
    .select('student_id')
    .eq('school_id', schoolId)
    .in('student_id', studentIds);

  // إحالات سلوكية
  const { data: referralRecs } = await supabaseAdmin
    .from('behavioral_referrals')
    .select('student_id')
    .eq('school_id', schoolId)
    .in('student_id', studentIds);

  // إعارات المكتبة
  const { data: loanRecs } = await supabaseAdmin
    .from('lrc_loans')
    .select('student_id: borrower_id')
    .eq('school_id', schoolId)
    .eq('borrower_type', 'student')
    .in('borrower_id', studentIds);

  // زيارات المكتبة (حضر فيها)
  const { data: visitAttRecs } = await supabaseAdmin
    .from('lrc_visit_attendance')
    .select('student_id')
    .eq('school_id', schoolId)
    .eq('is_present', true)
    .in('student_id', studentIds);

  // ─── بناء الخرائط ─────────────────────────────────────────────────────────

  const count = (arr: Array<{ student_id: string }> | null) => {
    const map: Record<string, number> = {};
    (arr ?? []).forEach(r => { map[r.student_id] = (map[r.student_id] ?? 0) + 1; });
    return map;
  };

  const absenceMap    = count(absenceRecs);
  const lateMap       = count(lateRecs);
  const exitMap       = count(exitRecs);
  const referralMap   = count(referralRecs);
  const loanMap       = count(loanRecs as Array<{ student_id: string }>);
  const visitAttMap   = count(visitAttRecs);

  // إجمالي الحصص لكل طالب (حضر + غاب + متأخر)
  const totalMap: Record<string, number> = {};
  const presentMap: Record<string, number> = {};
  (totalRecs ?? []).forEach(r => {
    totalMap[r.student_id]   = (totalMap[r.student_id]   ?? 0) + 1;
    if (r.status === 'present' || r.status === 'excused') {
      presentMap[r.student_id] = (presentMap[r.student_id] ?? 0) + 1;
    }
  });

  // ─── حساب risk_score و risk_level ────────────────────────────────────────

  function computeRisk(
    absences:  number,
    referrals: number,
    totalSessions: number,
  ): { score: number; level: 'low' | 'medium' | 'high' } {
    // نسبة الغياب
    const absRate = totalSessions > 0 ? absences / totalSessions : 0;
    // نقاط: 0–100 (كلما ارتفع الرقم زاد الخطر)
    const score = Math.min(100, Math.round(absRate * 70 + referrals * 10));

    if (score >= 60 || absences >= 15) return { score, level: 'high' };
    if (score >= 30 || absences >= 5)  return { score, level: 'medium' };
    return { score, level: 'low' };
  }

  // ─── UPSERT لكل طالب ─────────────────────────────────────────────────────

  const errors: string[] = [];
  let updated = 0;

  // نُرسل على دفعات من 50 لتفادي ضغط الـ DB
  const BATCH = 50;
  for (let i = 0; i < studentIds.length; i += BATCH) {
    const batch = studentIds.slice(i, i + BATCH);

    const rows = batch.map(studentId => {
      const absences  = absenceMap[studentId]  ?? 0;
      const lates     = lateMap[studentId]     ?? 0;
      const exits     = exitMap[studentId]     ?? 0;
      const referrals = referralMap[studentId] ?? 0;
      const loans     = loanMap[studentId]     ?? 0;
      const visits    = visitAttMap[studentId] ?? 0;
      const total     = totalMap[studentId]    ?? 0;
      const present   = presentMap[studentId]  ?? 0;

      const attendanceRate = total > 0
        ? Math.round((present / total) * 100 * 100) / 100
        : null;

      const behaviorScore = Math.max(0, 100 - referrals * 15);
      const { score: riskScore, level: riskLevel } = computeRisk(absences, referrals, total);

      return {
        student_id:              studentId,
        school_id:               schoolId,
        academic_year_id:        academicYearId,
        total_absences_ytd:      absences,
        total_lates_ytd:         lates,
        total_exits_ytd:         exits,
        attendance_rate:         attendanceRate,
        behavior_incidents_ytd:  referrals,
        referrals_ytd:           referrals,
        behavior_score:          behaviorScore,
        lrc_loans_ytd:           loans,
        lrc_visits_attended_ytd: visits,
        risk_score:              riskScore,
        risk_level:              riskLevel,
        updated_at:              new Date().toISOString(),
      };
    });

    const { error } = await supabaseAdmin
      .from('student_analytics_cache')
      .upsert(rows, { onConflict: 'student_id,academic_year_id' });

    if (error) {
      errors.push(`batch ${i}–${i + BATCH}: ${error.message}`);
    } else {
      updated += batch.length;
    }
  }

  return { ok: true, data: { students_updated: updated, errors } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. runFullFeed — يشغّل الثلاث عمليات معاً (للاستدعاء من cron)
// ─────────────────────────────────────────────────────────────────────────────

export async function runFullFeed(
  schoolId: string,
): Promise<WorkflowResult<{
  daily:   FeedSummary;
  weekly:  { classes_updated: number; errors: string[] };
  student: { students_updated: number; errors: string[] } | null;
}>> {
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('timezone')
    .eq('id', schoolId)
    .maybeSingle();

  const tz        = (school?.timezone as string | null) ?? 'Asia/Riyadh';
  const todayDate = getTodayInTimezone(tz);
  const wStart    = getWeekStart(todayDate);

  const [dailyResult, weeklyResult] = await Promise.all([
    runDailyFeed(schoolId),
    runWeeklySummaryFeed(schoolId, wStart),
  ]);

  // student cache يحتاج academic_year_id النشطة
  const { data: yearRow } = await supabaseAdmin
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  let studentResult: { students_updated: number; errors: string[] } | null = null;
  if (yearRow?.id) {
    const res = await runStudentCacheFeed(schoolId, yearRow.id as string);
    if (res.ok) studentResult = res.data;
  }

  if (!dailyResult.ok)  return { ok: false, error: dailyResult.error };
  if (!weeklyResult.ok) return { ok: false, error: weeklyResult.error };

  return {
    ok: true,
    data: {
      daily:   dailyResult.data,
      weekly:  weeklyResult.ok ? weeklyResult.data : { classes_updated: 0, errors: [] },
      student: studentResult,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. triggerFeedForCurrentUser — Server Action للاستدعاء من الواجهة
//    يتحقق من أن المستخدم school_admin أو system_owner قبل التشغيل
// ─────────────────────────────────────────────────────────────────────────────

export async function triggerFeedForCurrentUser(): Promise<WorkflowResult<FeedSummary>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  if (!hasPermission({ userId: persona.userId, role: persona.role, schoolId: persona.schoolId, isSystemOwner: persona.isSystemOwner ?? false }, 'school.view_analytics')) {
    return { ok: false, error: 'هذه العملية للمنسقين فقط' };
  }

  const result = await runDailyFeed(persona.schoolId);
  return result;
}
