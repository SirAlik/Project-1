'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import { getActivePersona }           from '../auth/context-service';
import { hasPermission }              from '../auth/pbac';
import { startWorkflow }              from '../workflow-service';
import { toSafeError }                from '../safe-error';
import type { WorkflowResult }        from '../workflow-service';
import type {
  BulkUploadJob,
  BulkJobType,
  BulkValidationSummary,
} from '../types/layer7';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeJobNumber(): string {
  const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const seq      = Date.now().toString().slice(-5);
  return `BUL-${datePart}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getMyJobs
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyJobs(): Promise<WorkflowResult<BulkUploadJob[]>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول' };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('bulk_upload_jobs')
    .select(
      'id, school_id, workflow_instance_id, job_type, job_number, file_name, ' +
      'validation_summary, total_rows, processed_rows, error_log, ' +
      'uploaded_by_persona_id, uploaded_by_name_snapshot, ' +
      'approved_by_persona_id, approved_by_name_snapshot, approved_at, ' +
      'status, notes, created_at, completed_at',
    )
    .eq('school_id', persona.schoolId)
    .order('created_at', { ascending: false });

  if (error) return { ok: false, error: toSafeError('[bulk-upload] getMyJobs', error, 'تعذّر تحميل مهام الرفع، يرجى المحاولة لاحقاً') };

  return { ok: true, data: (data ?? []) as unknown as BulkUploadJob[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. createJob — يُنشئ مهمة بعد التحقق من الصحة
// ─────────────────────────────────────────────────────────────────────────────

export async function createJob(input: {
  job_type:           BulkJobType;
  file_name:          string;
  validation_summary: BulkValidationSummary;
  parsed_rows:        Record<string, string>[];
}): Promise<WorkflowResult<{ job_id: string; job_number: string }>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return { ok: false, error: 'يرجى تسجيل الدخول بسياق مدرسة' };
  }
  if (!hasPermission({ userId: persona.userId, role: persona.role, schoolId: persona.schoolId, isSystemOwner: persona.isSystemOwner ?? false }, 'school.bulk_upload')) {
    return { ok: false, error: 'ليس لديك صلاحية إنشاء مهام رفع' };
  }

  const MAX_ROWS = 10_000;
  if (input.parsed_rows.length > MAX_ROWS) {
    return { ok: false, error: `الحد الأقصى للرفع ${MAX_ROWS.toLocaleString('ar-SA')} صف — الملف يحتوي ${input.parsed_rows.length.toLocaleString('ar-SA')} صف` };
  }

  const supabase = await createSupabaseServerClient();

  // جلب persona_id
  const { data: personaRow } = await supabase
    .from('user_personas')
    .select('id')
    .eq('user_id', persona.userId)
    .eq('school_id', persona.schoolId)
    .eq('role', persona.role)
    .limit(1)
    .single();

  if (!personaRow) return { ok: false, error: 'تعذّر التحقق من الهوية' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', persona.userId)
    .single();

  const uploaderName = profile?.full_name ?? persona.displayName ?? 'غير معروف';
  const jobNumber    = makeJobNumber();

  const status = input.validation_summary.error_rows === 0
    ? 'validated'
    : 'validation_failed';

  const { data: job, error } = await supabase
    .from('bulk_upload_jobs')
    .insert({
      school_id:                  persona.schoolId,
      job_type:                   input.job_type,
      job_number:                 jobNumber,
      file_name:                  input.file_name,
      validation_summary:         input.validation_summary,
      parsed_rows:                status === 'validated' ? input.parsed_rows : null,
      total_rows:                 input.validation_summary.valid_rows,
      uploaded_by_persona_id:     personaRow.id,
      uploaded_by_name_snapshot:  uploaderName,
      status,
    })
    .select('id')
    .single();

  if (error || !job) {
    return { ok: false, error: toSafeError('[bulk-upload] createJob', error, 'تعذّر إنشاء مهمة الرفع، يرجى المحاولة لاحقاً') };
  }

  // إطلاق workflow للمسار الرسمي (اختياري — لأغراض التدقيق)
  if (status === 'validated') {
    const wfResult = await startWorkflow({
      workflow_code: 'BULK_UPLOAD',
      subject_ref: {
        table:     'bulk_upload_jobs',
        id:        job.id,
        type:      'رفع مجمّع',
        display:   `${input.file_name} — ${jobNumber}`,
        school_id: persona.schoolId,
      },
      context_data: {
        job_type:   input.job_type,
        job_number: jobNumber,
        total_rows: input.validation_summary.valid_rows,
      },
    });

    if (wfResult.ok) {
      await supabase
        .from('bulk_upload_jobs')
        .update({ workflow_instance_id: wfResult.data.instance_id })
        .eq('id', job.id);
    }
  }

  return { ok: true, data: { job_id: job.id, job_number: jobNumber } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. deleteJob — حذف مهمة (validated أو validation_failed فقط)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteJob(jobId: string): Promise<WorkflowResult<null>> {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) return { ok: false, error: 'يرجى تسجيل الدخول' };

  const supabase = await createSupabaseServerClient();

  const { data: job } = await supabase
    .from('bulk_upload_jobs')
    .select('status, uploaded_by_persona_id')
    .eq('id', jobId)
    .eq('school_id', persona.schoolId)
    .single();

  if (!job) return { ok: false, error: 'المهمة غير موجودة' };

  const deletableStatuses = ['validated', 'validation_failed', 'rejected'];
  if (!deletableStatuses.includes(job.status)) {
    return { ok: false, error: `لا يمكن حذف مهمة بحالة: ${job.status}` };
  }

  await supabase.from('bulk_upload_jobs').delete().eq('id', jobId);

  return { ok: true, data: null };
}
