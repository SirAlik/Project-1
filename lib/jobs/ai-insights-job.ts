'use server';

import { supabaseAdmin }          from '../db/supabase-admin';
import { generateInsightSystem }  from '../services/ai-service';
import type { WorkflowResult }    from '../workflow-service';
import type {
  AIContextType,
  AIRoleTarget,
} from '../types/ai';

// ─────────────────────────────────────────────────────────────────────────────
// الأنواع
// ─────────────────────────────────────────────────────────────────────────────

interface InsightTarget {
  contextType: AIContextType;
  roleTarget:  AIRoleTarget;
}

interface SchoolJobResult {
  school_id:       string;
  insights_ok:     number;
  insights_failed: number;
}

interface JobSummary {
  schools_processed: number;
  total_ok:          number;
  total_failed:      number;
  errors:            string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// الرؤى التي تُولَّد يومياً لكل مدرسة
// ─────────────────────────────────────────────────────────────────────────────

const DAILY_INSIGHT_TARGETS: InsightTarget[] = [
  { contextType: 'school_overview',     roleTarget: 'school_principal'   },
  { contextType: 'attendance_analysis', roleTarget: 'student_affairs_vp' },
];

// ─────────────────────────────────────────────────────────────────────────────
// تنفيذ الرؤى لمدرسة واحدة
// ─────────────────────────────────────────────────────────────────────────────

export async function runAIInsightsForSchool(
  schoolId: string,
): Promise<WorkflowResult<SchoolJobResult>> {
  let okCount     = 0;
  let failedCount = 0;

  for (const { contextType, roleTarget } of DAILY_INSIGHT_TARGETS) {
    const res = await generateInsightSystem(
      schoolId,
      contextType,
      'school',
      schoolId,
      roleTarget,
    );

    if (res.ok) {
      okCount++;
    } else {
      failedCount++;
      console.error(
        `[ai-insights-job] ${roleTarget}/${contextType} school=${schoolId}: ${res.error}`,
      );
    }
  }

  return {
    ok:   true,
    data: { school_id: schoolId, insights_ok: okCount, insights_failed: failedCount },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// تنفيذ الرؤى لجميع المدارس (يُستدعى من cron route)
// ─────────────────────────────────────────────────────────────────────────────

export async function runAIInsightsJob(): Promise<WorkflowResult<JobSummary>> {
  const { data: schools, error: schErr } = await supabaseAdmin
    .from('schools')
    .select('id');

  if (schErr) {
    return { ok: false, error: `فشل جلب المدارس: ${schErr.message}` };
  }

  const schoolList = (schools ?? []) as { id: string }[];
  const errors: string[] = [];
  let totalOk     = 0;
  let totalFailed = 0;

  // تنفيذ متوازٍ — كل مدرسة مستقلة
  await Promise.all(
    schoolList.map(async ({ id }) => {
      const res = await runAIInsightsForSchool(id);
      if (res.ok) {
        totalOk     += res.data.insights_ok;
        totalFailed += res.data.insights_failed;
        if (res.data.insights_failed > 0) {
          errors.push(`school ${id}: ${res.data.insights_failed} رؤية فشلت`);
        }
      }
    }),
  );

  return {
    ok:   true,
    data: {
      schools_processed: schoolList.length,
      total_ok:          totalOk,
      total_failed:      totalFailed,
      errors,
    },
  };
}
