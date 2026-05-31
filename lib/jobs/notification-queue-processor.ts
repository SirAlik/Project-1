'use server';

/**
 * notification-queue-processor.ts
 *
 * يُعالج notification_queue (channel=app, status=pending):
 *   1. يُنشئ صف في notifications (inbox المستخدم)
 *   2. يُحوِّل recipient_role → persona_ids (broadcast)
 *   3. يُحدِّث status → 'sent' في notification_queue
 *
 * يُستدعى من /api/cron/daily-feed بعد runAutomationEngine.
 */

import { supabaseAdmin } from '../db/supabase-admin';
import type { WorkflowResult } from '../workflow-service';

// ─────────────────────────────────────────────────────────────────────────────
// Template map
// ─────────────────────────────────────────────────────────────────────────────

type TemplateRenderer = (p: Record<string, unknown>) => { title: string; body: string };

const TEMPLATES: Record<string, TemplateRenderer> = {
  absence_threshold_alert: p => ({
    title: 'تنبيه غياب متكرر',
    body:  `طالب تجاوز حد الغياب (${p.count ?? '?'} غيابة — الحد: ${p.threshold ?? '?'})`,
  }),
  late_threshold_alert: p => ({
    title: 'تنبيه تأخر متكرر',
    body:  `طالب تجاوز حد التأخر (${p.count ?? '?'} مرة)`,
  }),
  loan_overdue_reminder: () => ({
    title: 'تأخر إعادة كتاب',
    body:  `مستعير لم يُعِد الكتاب في الموعد المحدد`,
  }),
  health_referral_today: () => ({
    title: 'إحالة صحية جديدة',
    body:  'صدرت إحالة صحية اليوم — يُرجى المتابعة',
  }),
};

function renderTemplate(
  key:     string,
  payload: Record<string, unknown>,
): { title: string; body: string } {
  const fn = TEMPLATES[key];
  if (fn) return fn(payload);
  // قالب مجهول — عرض المفتاح كعنوان
  return { title: key.replace(/_/g, ' '), body: JSON.stringify(payload) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main processor
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessQueueResult {
  processed:  number;
  failed:     number;
  errors:     string[];
}

export async function processNotificationQueue(
  schoolId: string,
): Promise<WorkflowResult<ProcessQueueResult>> {
  // جلب الإشعارات المعلقة للقناة app
  const { data: items, error: fetchErr } = await supabaseAdmin
    .from('notification_queue')
    .select('*')
    .eq('school_id', schoolId)
    .eq('channel', 'app')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(200);

  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!items?.length) return { ok: true, data: { processed: 0, failed: 0, errors: [] } };

  let processed = 0;
  let failed    = 0;
  const errors: string[] = [];

  await Promise.all(items.map(async (item: Record<string, unknown>) => {
    try {
      const { title, body } = renderTemplate(
        item.template_key as string,
        (item.payload as Record<string, unknown>) ?? {},
      );

      const notifications: Record<string, unknown>[] = [];

      if (item.recipient_id) {
        // إشعار لفرد محدد — نحتاج persona_id له
        const { data: persona } = await supabaseAdmin
          .from('user_personas')
          .select('id')
          .eq('school_id', schoolId)
          .eq('user_id', item.recipient_id as string)
          .limit(1)
          .maybeSingle();

        notifications.push({
          school_id:            schoolId,
          recipient_persona_id: persona?.id ?? null,
          recipient_role:       persona ? null : null,
          notification_type:    item.source_module ?? 'automation',
          title,
          body,
          source_table:         String(item.source_module ?? ''),
          source_record_id:     item.source_id ?? null,
        });
      } else if (item.recipient_role) {
        // broadcast لجميع حاملي الدور في المدرسة
        const { data: personas } = await supabaseAdmin
          .from('user_personas')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', item.recipient_role as string);

        if (personas?.length) {
          personas.forEach(p => {
            notifications.push({
              school_id:            schoolId,
              recipient_persona_id: p.id,
              recipient_role:       null,
              notification_type:    String(item.source_module ?? 'automation'),
              title,
              body,
              source_table:         String(item.source_module ?? ''),
              source_record_id:     item.source_id ?? null,
            });
          });
        } else {
          // لا persona موجودة — إشعار بالدور فقط
          notifications.push({
            school_id:            schoolId,
            recipient_persona_id: null,
            recipient_role:       item.recipient_role as string,
            notification_type:    String(item.source_module ?? 'automation'),
            title,
            body,
            source_table:         String(item.source_module ?? ''),
            source_record_id:     item.source_id ?? null,
          });
        }
      }

      if (notifications.length > 0) {
        const { error: insertErr } = await supabaseAdmin
          .from('notifications')
          .insert(notifications);

        if (insertErr) throw new Error(insertErr.message);
      }

      // تحديث الحالة إلى sent
      await supabaseAdmin
        .from('notification_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id as string);

      processed++;
    } catch (err) {
      failed++;
      errors.push(`queue item ${item.id}: ${String(err)}`);

      // تسجيل الفشل في قاعدة البيانات
      await supabaseAdmin
        .from('notification_queue')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', item.id as string);
    }
  }));

  return { ok: true, data: { processed, failed, errors } };
}
