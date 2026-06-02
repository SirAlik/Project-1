'use server';

/**
 * lrc-maintenance-service.ts
 *
 * صيانة LRC اليومية — يُستدعى من /api/cron/daily-maintenance
 *
 * المهام:
 *   1. تحديث الإعارات المتأخرة: active + due_date < today → overdue
 *   2. تذكيرات: active + due_date = tomorrow → notification_queue
 *
 * مبدأ الإيدمبوتنسية:
 *   notification_queue لها UNIQUE على (source_module, source_id, recipient_id, template_key)
 *   — التكرار يُتجاهَل صامتاً (error code 23xxx)
 */

import { supabaseAdmin }       from '../db/supabase-admin';
import type { WorkflowResult } from '../workflow-service';

export interface LrcMaintenanceResult {
  loans_marked_overdue: number;
  reminders_queued:     number;
  errors:               string[];
}

export async function runLrcMaintenance(
  schoolId: string,
): Promise<WorkflowResult<LrcMaintenanceResult>> {
  const today    = new Date().toISOString().split('T')[0]!;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]!;

  const errors: string[] = [];
  let loans_marked_overdue = 0;
  let reminders_queued     = 0;

  // ─── 1. تحديث الإعارات المتأخرة ──────────────────────────────
  const { data: overdueLoans, error: overdueErr } = await supabaseAdmin
    .from('lrc_loans')
    .update({ status: 'overdue' })
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .lt('due_date', today)
    .select('id, borrower_id, borrower_type');

  if (overdueErr) {
    errors.push(`overdue update: ${overdueErr.message}`);
  } else {
    loans_marked_overdue = overdueLoans?.length ?? 0;
    for (const loan of (overdueLoans ?? [])) {
      await enqueueLoanNotification(
        schoolId,
        loan.id            as string,
        loan.borrower_id   as string,
        loan.borrower_type as string,
        'lrc_loan_overdue',
        errors,
      );
    }
  }

  // ─── 2. تذكيرات الإعارات المستحقة غداً ──────────────────────
  const { data: dueLoans, error: dueErr } = await supabaseAdmin
    .from('lrc_loans')
    .select('id, borrower_id, borrower_type')
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .eq('due_date', tomorrow);

  if (dueErr) {
    errors.push(`due tomorrow: ${dueErr.message}`);
  } else {
    for (const loan of (dueLoans ?? [])) {
      const prev = errors.length;
      await enqueueLoanNotification(
        schoolId,
        loan.id            as string,
        loan.borrower_id   as string,
        loan.borrower_type as string,
        'lrc_loan_reminder',
        errors,
      );
      if (errors.length === prev) reminders_queued++;
    }
  }

  return { ok: true, data: { loans_marked_overdue, reminders_queued, errors } };
}

// ─────────────────────────────────────────────────────────────────────────────

async function enqueueLoanNotification(
  schoolId:     string,
  loanId:       string,
  borrowerId:   string,
  borrowerType: string,
  templateKey:  string,
  errors:       string[],
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('notification_queue')
    .insert({
      school_id:      schoolId,
      recipient_id:   borrowerId,
      recipient_role: borrowerType === 'teacher' ? 'teacher' : 'student',
      channel:        'app',
      template_key:   templateKey,
      payload:        { loan_id: loanId },
      source_module:  'lrc',
      source_id:      loanId,
      status:         'pending',
      scheduled_at:   new Date().toISOString(),
    });

  // كود 23xxx = unique violation — التكرار مُعالَج DB-side، تجاهله
  if (error && !error.code?.startsWith('23')) {
    errors.push(`notify ${templateKey} for ${loanId}: ${error.message}`);
  }
}
