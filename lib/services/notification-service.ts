'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { toSafeError }                from '../safe-error';
import type { WorkflowResult }        from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id:                  string;
  notification_type:   string;
  title:               string;
  body:                string | null;
  source_table:        string | null;
  source_record_id:    string | null;
  workflow_instance_id: string | null;
  is_read:             boolean;
  read_at:             string | null;
  created_at:          string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getMyNotifications
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyNotifications(
  limit = 50,
): Promise<WorkflowResult<NotificationItem[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  // جلب persona_id للمستخدم في هذه المدرسة
  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return { ok: false, error: 'تعذّر التحقق من الهوية' };

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, notification_type, title, body, source_table, source_record_id, ' +
      'workflow_instance_id, is_read, read_at, created_at',
    )
    .eq('school_id', persona.schoolId)
    .or(
      `recipient_persona_id.eq.${personaRow.id},` +
      `and(recipient_role.eq.${persona.role},recipient_persona_id.is.null)`,
    )
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, error: toSafeError('[notifications] getMine', error, 'تعذّر تحميل الإشعارات، يرجى المحاولة لاحقاً') };
  return { ok: true, data: (data ?? []) as unknown as NotificationItem[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getUnreadCount
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<WorkflowResult<number>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: true, data: 0 };

  const supabase = await createSupabaseServerClient();

  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return { ok: true, data: 0 };

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', persona.schoolId)
    .eq('is_read', false)
    .or(
      `recipient_persona_id.eq.${personaRow.id},` +
      `and(recipient_role.eq.${persona.role},recipient_persona_id.is.null)`,
    );

  if (error) return { ok: true, data: 0 };
  return { ok: true, data: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. markAsRead
// ─────────────────────────────────────────────────────────────────────────────

export async function markAsRead(notificationId: string): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('school_id', persona.schoolId);

  if (error) return { ok: false, error: toSafeError('[notifications] markAsRead', error, 'تعذّر تحديث حالة الإشعار، يرجى المحاولة لاحقاً') };
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. markAllAsRead
// ─────────────────────────────────────────────────────────────────────────────

export async function markAllAsRead(): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return { ok: false, error: 'تعذّر التحقق من الهوية' };

  const now = new Date().toISOString();

  // تحديث الإشعارات المباشرة (persona_id) والإشعارات بالدور
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: now })
    .eq('school_id', persona.schoolId)
    .eq('is_read', false)
    .or(
      `recipient_persona_id.eq.${personaRow.id},` +
      `and(recipient_role.eq.${persona.role},recipient_persona_id.is.null)`,
    );

  return { ok: true, data: null };
}
