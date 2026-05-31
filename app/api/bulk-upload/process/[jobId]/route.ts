import { NextRequest, NextResponse } from 'next/server';
import { getActivePersona }         from '@/lib/auth/context-service';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { supabaseAdmin }            from '@/lib/db/supabase-admin';

const ALLOWED_ROLES = ['school_principal', 'school_admin', 'school_secretary'];

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // Auth
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) {
    return NextResponse.json({ ok: false, error: 'يرجى تسجيل الدخول' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(persona.role) && !persona.isSystemOwner) {
    return NextResponse.json({ ok: false, error: 'ليس لديك صلاحية معالجة هذا الملف' }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  // جلب المهمة
  const { data: job, error: jobErr } = await supabase
    .from('bulk_upload_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('school_id', persona.schoolId)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ ok: false, error: 'المهمة غير موجودة' }, { status: 404 });
  }

  if (!['validated', 'approved'].includes(job.status)) {
    return NextResponse.json({
      ok:    false,
      error: `لا يمكن معالجة مهمة بحالة: ${job.status}`,
    }, { status: 400 });
  }

  const parsedRows = (job.parsed_rows ?? []) as Record<string, string>[];
  if (parsedRows.length === 0) {
    return NextResponse.json({ ok: false, error: 'لا توجد صفوف صالحة للمعالجة' }, { status: 400 });
  }

  // تحديث الحالة إلى processing
  await supabase
    .from('bulk_upload_jobs')
    .update({ status: 'processing', total_rows: parsedRows.length })
    .eq('id', jobId);

  // ── معالجة student_enrollment
  if (job.job_type === 'student_enrollment') {
    // جلب الفصول الدراسية للمدرسة (لاستخدامها في class_name → class_id)
    const { data: classes } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .eq('school_id', persona.schoolId);

    const classMap: Record<string, string> = {};
    (classes ?? []).forEach((c: { id: string; name: string }) => {
      classMap[c.name.trim().toLowerCase()] = c.id;
    });

    const errorLog: Record<string, unknown>[] = [];
    let processed = 0;

    // معالجة دفعات من 50 صفاً لتجنب timeout
    const BATCH = 50;
    for (let i = 0; i < parsedRows.length; i += BATCH) {
      const batch = parsedRows.slice(i, i + BATCH);

      const inserts = batch.map((row) => {
        const classId =
          row.class_name
            ? classMap[row.class_name.trim().toLowerCase()] ?? null
            : null;

        return {
          name:       row.name.trim(),
          national_id: row.national_id.trim(),
          class_id:   classId,
          parent_phone: row.parent_phone?.trim() || null,
          grade_level:  row.grade_level ? parseInt(row.grade_level, 10) || null : null,
          is_approved: true,
        };
      });

      const { error: insertErr, count } = await supabaseAdmin
        .from('student_profiles')
        .upsert(inserts, {
          onConflict:      'national_id',
          ignoreDuplicates: false,
          count:           'exact',
        });

      if (insertErr) {
        errorLog.push({ batch: Math.floor(i / BATCH) + 1, error: insertErr.message });
      } else {
        processed += count ?? batch.length;
      }

      // تحديث التقدم
      await supabase
        .from('bulk_upload_jobs')
        .update({ processed_rows: Math.min(i + BATCH, parsedRows.length) })
        .eq('id', jobId);
    }

    const finalStatus = errorLog.length === 0 ? 'completed' : 'failed';
    await supabase
      .from('bulk_upload_jobs')
      .update({
        status:        finalStatus,
        processed_rows: processed,
        error_log:     errorLog,
        completed_at:  new Date().toISOString(),
      })
      .eq('id', jobId);

    return NextResponse.json({ ok: true, processed, errors: errorLog.length });
  }

  // نوع غير مدعوم
  await supabase
    .from('bulk_upload_jobs')
    .update({ status: 'failed', error_log: [{ error: `job_type غير مدعوم: ${job.job_type}` }] })
    .eq('id', jobId);

  return NextResponse.json({ ok: false, error: `نوع المهمة "${job.job_type}" غير مدعوم بعد` }, { status: 400 });
}
