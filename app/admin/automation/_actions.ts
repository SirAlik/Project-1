'use server';

import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { getActivePersona } from '@/lib/auth/context-service';
import type { PersonaContext } from '@/lib/auth/context-service';
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
  name:          string;
  trigger_event: string;
  condition:     Record<string, unknown>;
  action:        string;
  action_config: Record<string, unknown>;
  // school_id يُجاهَل لـ school_admin — يأتي من الـ persona server-side
  school_id?:    string;
}

type AuthResult =
  | { ok: false; error: string }
  | { ok: true; persona: PersonaContext };

async function requireOwnerPersona(): Promise<AuthResult> {
  const persona = await getActivePersona();
  if (!persona) return { ok: false, error: 'غير مصرح' };
  if (persona.role !== 'system_owner' && persona.role !== 'school_admin')
    return { ok: false, error: 'غير مصرح' };
  return { ok: true, persona };
}

export async function getRulesAction(
  schoolId: string,
): Promise<WorkflowResult<AutomationRule[]>> {
  const result = await requireOwnerPersona();
  if (!result.ok) return result as WorkflowResult<AutomationRule[]>;

  const { persona } = result;
  // school_admin مقيّد بمدرسته فقط بغض النظر عن المعامل الممرَّر
  const scopedId = persona.role === 'school_admin' ? (persona.schoolId ?? schoolId) : schoolId;

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .select('*')
    .eq('school_id', scopedId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as AutomationRule[] };
}

export async function toggleRuleAction(
  ruleId:   string,
  isActive: boolean,
): Promise<WorkflowResult<null>> {
  const result = await requireOwnerPersona();
  if (!result.ok) return result;

  const { persona } = result;
  if (persona.role === 'school_admin' && !persona.schoolId)
    return { ok: false, error: 'لا يمكن تحديد المدرسة' };

  const { error } = persona.role === 'school_admin'
    ? await supabaseAdmin
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId)
        .eq('school_id', persona.schoolId!)
    : await supabaseAdmin
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function createRuleAction(
  input: CreateRuleInput,
): Promise<WorkflowResult<AutomationRule>> {
  const result = await requireOwnerPersona();
  if (!result.ok) return result as WorkflowResult<AutomationRule>;

  const { persona } = result;
  // school_admin: يأتي school_id من الـ persona — يُتجاهل input.school_id
  const schoolId = persona.role === 'school_admin' ? persona.schoolId : input.school_id;
  if (!schoolId) return { ok: false, error: 'school_id مطلوب' };

  const { data, error } = await supabaseAdmin
    .from('automation_rules')
    .insert({
      name:          input.name,
      trigger_event: input.trigger_event,
      condition:     input.condition,
      action:        input.action,
      action_config: input.action_config,
      school_id:     schoolId,
      is_active:     true,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data as AutomationRule };
}

export async function deleteRuleAction(
  ruleId: string,
): Promise<WorkflowResult<null>> {
  const result = await requireOwnerPersona();
  if (!result.ok) return result;

  const { persona } = result;
  if (persona.role === 'school_admin' && !persona.schoolId)
    return { ok: false, error: 'لا يمكن تحديد المدرسة' };

  const { error } = persona.role === 'school_admin'
    ? await supabaseAdmin
        .from('automation_rules')
        .delete()
        .eq('id', ruleId)
        .eq('school_id', persona.schoolId!)
    : await supabaseAdmin
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function getSchoolsAction(): Promise<WorkflowResult<{ id: string; name: string }[]>> {
  const result = await requireOwnerPersona();
  if (!result.ok) return result as WorkflowResult<{ id: string; name: string }[]>;

  const { persona } = result;

  // school_admin يرى مدرسته فقط في القائمة
  const query = supabaseAdmin.from('schools').select('id, name').order('name');
  const { data, error } = persona.role === 'school_admin' && persona.schoolId
    ? await query.eq('id', persona.schoolId)
    : await query;

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as { id: string; name: string }[] };
}
