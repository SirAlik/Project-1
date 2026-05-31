'use server';

import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';
import type { WorkflowResult } from '@/lib/workflow-service';

export interface AutomationRule {
  id:            string;
  school_id:     string;
  name:          string;
  trigger_event: string;
  condition:     Record<string, unknown>;
  action:        string;
  action_config: Record<string, unknown>;
  is_active:     boolean;
  created_at:    string;
}

export interface CreateRuleInput {
  school_id:     string;
  name:          string;
  trigger_event: string;
  condition:     Record<string, unknown>;
  action:        string;
  action_config: Record<string, unknown>;
}

async function requireOwner(): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona) return { ok: false, error: 'غير مصرح' };
  if (persona.role !== 'system_owner' && persona.role !== 'school_admin')
    return { ok: false, error: 'غير مصرح' };
  return { ok: true, data: null };
}

export async function getRulesAction(
  schoolId: string,
): Promise<WorkflowResult<AutomationRule[]>> {
  const auth = await requireOwner();
  if (!auth.ok) return auth as WorkflowResult<AutomationRule[]>;

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('school_id', schoolId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AutomationRule[] };
}

export async function toggleRuleAction(
  ruleId:   string,
  isActive: boolean,
): Promise<WorkflowResult<null>> {
  const auth = await requireOwner();
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from('automation_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function createRuleAction(
  input: CreateRuleInput,
): Promise<WorkflowResult<AutomationRule>> {
  const auth = await requireOwner();
  if (!auth.ok) return auth as WorkflowResult<AutomationRule>;

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .insert({ ...input, is_active: true })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as AutomationRule };
}

export async function deleteRuleAction(
  ruleId: string,
): Promise<WorkflowResult<null>> {
  const auth = await requireOwner();
  if (!auth.ok) return auth;

  const { error } = await supabaseAdmin
    .from('automation_rules')
    .delete()
    .eq('id', ruleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function getSchoolsAction(): Promise<WorkflowResult<{ id: string; name: string }[]>> {
  const auth = await requireOwner();
  if (!auth.ok) return auth as WorkflowResult<{ id: string; name: string }[]>;

  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('id, name')
    .order('name');

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as { id: string; name: string }[] };
}
