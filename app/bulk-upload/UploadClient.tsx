'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useDropzone }    from 'react-dropzone';
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  AlertTriangle, Play, Trash2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { createJobAction, deleteJobAction, getJobsAction } from './_actions';
import type { BulkUploadJob, BulkValidationSummary } from '@/lib/types/layer7';
import { JOB_TYPE_SCHEMA } from '@/lib/types/layer7';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'validating' | 'validated' | 'saving' | 'processing' | 'done' | 'error';

interface ValidationResult {
  summary:     BulkValidationSummary;
  parsedRows:  Record<string, string>[];
  fileName:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  uploaded:          'مُرفَّع',
  validated:         'تم التحقق',
  validation_failed: 'فشل التحقق',
  awaiting_approval: 'بانتظار الموافقة',
  processing:        'جارٍ المعالجة',
  completed:         'مكتمل',
  failed:            'فشل',
  rejected:          'مرفوض',
};

const STATUS_COLORS: Record<string, string> = {
  validated:         'text-sky-400   bg-sky-400/10',
  validation_failed: 'text-red-400   bg-red-400/10',
  awaiting_approval: 'text-amber-400 bg-amber-400/10',
  processing:        'text-violet-400 bg-violet-400/10',
  completed:         'text-emerald-400 bg-emerald-400/10',
  failed:            'text-red-400   bg-red-400/10',
  rejected:          'text-red-400   bg-red-400/10',
  uploaded:          'text-sky-400   bg-sky-400/10',
};

// ─────────────────────────────────────────────────────────────────────────────
// Job List Card
// ─────────────────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onProcess,
  onDelete,
  processing,
}: {
  job:        BulkUploadJob;
  onProcess:  (id: string) => void;
  onDelete:   (id: string) => void;
  processing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const s                       = job.validation_summary;
  const statusCls               = STATUS_COLORS[job.status] ?? 'text-muted-foreground bg-muted/20';
  const canProcess              = job.status === 'validated';
  const canDelete               = ['validated', 'validation_failed', 'rejected'].includes(job.status);

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden">
      <div className="flex items-start gap-4 p-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate">{job.file_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${statusCls}`}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {job.job_number} · {new Date(job.created_at).toLocaleDateString('ar-SA')} ·{' '}
            {JOB_TYPE_SCHEMA[job.job_type]?.label ?? job.job_type}
          </p>
          {s && (
            <p className="text-xs">
              <span className="text-emerald-400 font-bold">{s.valid_rows} صح</span>
              {s.error_rows > 0 && (
                <span className="text-red-400 font-bold"> · {s.error_rows} خطأ</span>
              )}
              <span className="opacity-40"> من {s.total_rows}</span>
            </p>
          )}
          {job.status === 'completed' && (
            <p className="text-xs text-emerald-400 font-bold">
              ✓ أُدخل {job.processed_rows} سجل بنجاح
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(s?.error_rows ?? 0) > 0 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="عرض الأخطاء"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {canProcess && (
            <button
              onClick={() => onProcess(job.id)}
              disabled={processing === job.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all"
            >
              {processing === job.id
                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : <Play className="w-3.5 h-3.5" />}
              {processing === job.id ? 'جارٍ...' : 'تنفيذ'}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(job.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
              title="حذف"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* تفاصيل الأخطاء */}
      {expanded && s?.errors && s.errors.length > 0 && (
        <div className="border-t border-border px-5 py-4 bg-muted/20">
          <p className="text-xs font-black opacity-50 uppercase tracking-widest mb-3">
            أخطاء التحقق (أول {Math.min(s.errors.length, 10)})
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {s.errors.slice(0, 10).map((e, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-red-400 font-black shrink-0">صف {e.row}</span>
                <span className="opacity-40">·</span>
                <span className="font-bold opacity-60">{e.column}</span>
                <span className="opacity-40">·</span>
                <span>{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main UploadClient
// ─────────────────────────────────────────────────────────────────────────────
export function UploadClient({ initialJobs }: { initialJobs: BulkUploadJob[] }) {
  const [step, setStep]               = useState<Step>('idle');
  const [jobType]                     = useState<'student_enrollment'>('student_enrollment');
  const [validationResult, setValRes] = useState<ValidationResult | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [jobs, setJobs]               = useState<BulkUploadJob[]>(initialJobs);
  const [processingId, setProcessId]  = useState<string | null>(null);
  const [, startT]                    = useTransition();

  const refreshJobs = useCallback(async () => {
    const res = await getJobsAction();
    if (res.ok) setJobs(res.data);
  }, []);

  // polling خفيف عند وجود مهمة جارية
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'processing');
    if (!hasActive) return;
    const timer = setInterval(refreshJobs, 3000);
    return () => clearInterval(timer);
  }, [jobs, refreshJobs]);

  // ── Dropzone
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setStep('validating');
    setErrorMsg(null);
    setValRes(null);

    const form = new FormData();
    form.append('file', file);
    form.append('job_type', jobType);

    try {
      const res  = await fetch('/api/bulk-upload/validate', { method: 'POST', body: form });
      const json = await res.json();

      if (!json.ok) {
        setErrorMsg(json.error);
        setStep('error');
        return;
      }

      setValRes({ summary: json.summary, parsedRows: json.parsed_rows, fileName: file.name });
      setStep('validated');
    } catch {
      setErrorMsg('تعذّر الاتصال بالخادم');
      setStep('error');
    }
  }, [jobType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls', '.xlsx'] },
    maxFiles: 1,
    disabled: step === 'validating' || step === 'saving',
  });

  // ── حفظ المهمة
  const handleSave = () => {
    if (!validationResult) return;
    setStep('saving');

    startT(async () => {
      const result = await createJobAction({
        job_type:           jobType,
        file_name:          validationResult.fileName,
        validation_summary: validationResult.summary,
        parsed_rows:        validationResult.parsedRows,
      });

      if (result.ok) {
        setStep('idle');
        setValRes(null);
        await refreshJobs();
      } else {
        setErrorMsg(result.error);
        setStep('error');
      }
    });
  };

  // ── معالجة مهمة
  const handleProcess = async (jobId: string) => {
    setProcessId(jobId);
    try {
      const res  = await fetch(`/api/bulk-upload/process/${jobId}`, { method: 'POST' });
      const json = await res.json();
      if (!json.ok) setErrorMsg(json.error);
      await refreshJobs();
    } catch {
      setErrorMsg('تعذّر الاتصال بالخادم');
    } finally {
      setProcessId(null);
    }
  };

  // ── حذف مهمة
  const handleDelete = (jobId: string) => {
    startT(async () => {
      await deleteJobAction(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    });
  };

  const schema  = JOB_TYPE_SCHEMA[jobType];
  const summary = validationResult?.summary;

  return (
    <div className="space-y-8" dir="rtl">
      {/* منطقة الرفع */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            رفع ملف جديد
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {schema.label} — أعمدة مطلوبة: {schema.required.join(', ')}
            {schema.optional.length > 0 && ` · اختيارية: ${schema.optional.join(', ')}`}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : step === 'validating'
                ? 'border-amber-400/40 bg-amber-400/5 cursor-wait'
                : 'border-border hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground/40'}`} />
            {step === 'validating' ? (
              <p className="text-sm font-bold text-amber-400 animate-pulse">
                جارٍ التحقق من الملف...
              </p>
            ) : (
              <>
                <p className="text-sm font-bold">اسحب ملف CSV هنا أو انقر للاختيار</p>
                <p className="text-xs text-muted-foreground mt-1">CSV فقط · حد أقصى 1000 صف</p>
              </>
            )}
          </div>

          {/* خطأ عام */}
          {(step === 'error' && errorMsg) && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
          )}

          {/* نتائج التحقق */}
          {(step === 'validated' || step === 'saving') && summary && (
            <div className="space-y-4">
              {/* ملخص */}
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                summary.error_rows === 0
                  ? 'bg-emerald-400/10 border-emerald-400/20'
                  : 'bg-amber-400/10 border-amber-400/20'
              }`}>
                {summary.error_rows === 0
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  : <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-bold">
                    {summary.error_rows === 0
                      ? `✓ جميع الـ ${summary.total_rows} صف صالحة للرفع`
                      : `${summary.valid_rows} صف صالح · ${summary.error_rows} صف بأخطاء (سيُرفع الصالح فقط)`}
                  </p>
                  {summary.error_rows > 0 && (
                    <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                      {summary.errors.slice(0, 8).map((e, i) => (
                        <p key={i} className="text-xs opacity-70">
                          صف {e.row} · {e.column}: {e.message}
                        </p>
                      ))}
                      {summary.errors.length > 8 && (
                        <p className="text-xs opacity-50">و {summary.errors.length - 8} أخطاء أخرى...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* معاينة */}
              {summary.preview.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(summary.preview[0]).map((col) => (
                          <th key={col} className="px-4 py-2 text-right font-bold opacity-60 uppercase tracking-widest whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-4 py-2 text-muted-foreground">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* أزرار الإجراء */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => { setStep('idle'); setValRes(null); }}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-bold hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                {summary.valid_rows > 0 && (
                  <button
                    onClick={handleSave}
                    disabled={step === 'saving'}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
                  >
                    {step === 'saving'
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</>
                      : <><CheckCircle2 className="w-4 h-4" /> حفظ المهمة ({summary.valid_rows} صف)</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* نموذج مثال */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold opacity-40 hover:opacity-70 transition-opacity list-none flex items-center gap-1.5">
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
              عرض مثال على تنسيق الملف
            </summary>
            <pre className="mt-3 p-4 rounded-xl bg-muted text-xs font-mono text-muted-foreground overflow-x-auto">
              {schema.example}
            </pre>
          </details>
        </div>
      </div>

      {/* قائمة المهام */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">سجل المهام</h2>
          <button
            onClick={refreshJobs}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold opacity-40">لا توجد مهام رفع بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onProcess={handleProcess}
                onDelete={handleDelete}
                processing={processingId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
