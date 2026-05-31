'use server';

import { getInsightForRole, getOrGenerateInsight, generateInsight } from '@/lib/services/ai-service';
import { getActivePersona } from '@/lib/auth/context-service';
import type { AIContextType, AIScope, AIInsight } from '@/lib/types/ai';
import type { WorkflowResult } from '@/lib/workflow-service';

/**
 * يُعيد رؤية ذكاء اصطناعي محفوظة أو يُولّدها إذا انتهت صلاحيتها.
 * النطاق الافتراضي: school / schoolId — مناسب لصفحة المدير.
 */
export async function getMyInsight(
  contextType: AIContextType,
  scope: AIScope = 'school',
  scopeId?: string,
): Promise<WorkflowResult<AIInsight | null>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const resolvedScopeId = scopeId ?? persona.schoolId;

  return getInsightForRole(contextType, scope, resolvedScopeId);
}

/**
 * يُولّد رؤية جديدة متجاوزاً الكاش — يُستدعى من زر "تحديث".
 */
export async function refreshMyInsight(
  contextType: AIContextType,
  scope: AIScope = 'school',
  scopeId?: string,
): Promise<WorkflowResult<AIInsight>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const resolvedScopeId = scopeId ?? persona.schoolId;

  return generateInsight(contextType, scope, resolvedScopeId);
}

/**
 * كاش أولاً — يُعيد أو يُولّد عند الحاجة.
 */
export async function getOrRefreshInsight(
  contextType: AIContextType,
  scope: AIScope = 'school',
  scopeId?: string,
): Promise<WorkflowResult<AIInsight>> {
  const persona = await getActivePersona();
  if (!persona?.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const resolvedScopeId = scopeId ?? persona.schoolId;

  return getOrGenerateInsight(contextType, scope, resolvedScopeId);
}
