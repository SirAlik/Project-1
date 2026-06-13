import type { Metadata }    from 'next';
import Link                 from 'next/link';
import { redirect }         from 'next/navigation';
import { Plus, ShieldAlert, CheckCircle2, Clock, XCircle, FileSearch } from 'lucide-react';
import { getActivePersona } from '@/lib/auth/context-service';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { isQualityModuleEnabled } from '@/lib/quality/tenant-templates';
import { QualityDisabledNotice } from '@/components/quality/QualityDisabledNotice';

export const metadata: Metadata = { title: 'الإجراءات التصحيحية — سِدرة' };

interface NcrRow {
  id: string;
  report_number: string;
  source: string;
  description: string;
  status: string;
  detected_by_name_snapshot: string | null;
  detected_at: string;
  workflow_instance_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:                   { label: 'مفتوح',              color: 'text-amber-500  bg-amber-500/10  border-amber-500/20',  icon: <Clock      className="w-3 h-3" /> },
  in_progress:            { label: 'قيد التنفيذ',        color: 'text-blue-500   bg-blue-500/10   border-blue-500/20',   icon: <ShieldAlert className="w-3 h-3" /> },
  awaiting_verification:  { label: 'بانتظار التحقق',     color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', icon: <FileSearch  className="w-3 h-3" /> },
  closed_effective:       { label: 'مغلق — فعّال',       color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
  closed_ineffective:     { label: 'مغلق — غير فعّال',   color: 'text-rose-500   bg-rose-500/10   border-rose-500/20',   icon: <XCircle     className="w-3 h-3" /> },
  cancelled:              { label: 'ملغى',               color: 'text-muted-foreground bg-muted border-border',           icon: <XCircle     className="w-3 h-3" /> },
};

const SOURCE_LABELS: Record<string, string> = {
  internal_audit:    'تدقيق داخلي',
  external_audit:    'تدقيق خارجي',
  management_review: 'مراجعة الإدارة',
  complaint:         'شكوى',
  observation:       'ملاحظة',
  other:             'أخرى',
};

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function CorrectiveActionListPage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');

  // بوّابة الإتاحة لكل مستأجر (fail-closed): مدرسة غير مُسجَّلة في سجلّ القوالب → حالة فارغة صادقة
  if (!isQualityModuleEnabled(persona.schoolId, 'qa')) {
    return <QualityDisabledNotice moduleLabel="ضمان الجودة" />;
  }

  const supabase = await createSupabaseServerClient();

  // جلب الإجراءات التصحيحية للمدرسة
  const { data: reports, error } = await supabase
    .from('nonconformance_reports')
    .select(
      'id, report_number, source, description, status, ' +
      'detected_by_name_snapshot, detected_at, workflow_instance_id',
    )
    .eq('school_id', persona.schoolId)
    .order('detected_at', { ascending: false });

  if (error && error.code === '42P01') {
    // الجدول غير موجود بعد — يحتاج تطبيق Migration
    return (
      <MigrationRequired />
    );
  }

  const items = (reports ?? []) as unknown as NcrRow[];

  // إحصائيات سريعة
  const counts = {
    open:                 items.filter(r => r.status === 'open').length,
    in_progress:          items.filter(r => r.status === 'in_progress').length,
    awaiting_verification: items.filter(r => r.status === 'awaiting_verification').length,
    closed:               items.filter(r => r.status?.startsWith('closed')).length,
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground mb-1">ضمان الجودة / الإجراءات التصحيحية</p>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-500" />
              الإجراءات التصحيحية
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              عدم المطابقة والإجراء التصحيحي — ISO 9001:2015 بند 10.2
            </p>
          </div>
          <Link
            href="/qa/corrective-action/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            إجراء تصحيحي جديد
          </Link>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'مفتوح',           value: counts.open,                 color: 'text-amber-500' },
            { label: 'قيد التنفيذ',     value: counts.in_progress,          color: 'text-blue-500' },
            { label: 'بانتظار التحقق',  value: counts.awaiting_verification, color: 'text-teal-500' },
            { label: 'مغلق',            value: counts.closed,               color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="border border-border rounded-2xl bg-card p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* القائمة */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-bold text-foreground">لا توجد إجراءات تصحيحية بعد</p>
              <p className="text-sm text-muted-foreground mt-1">
                ابدأ بإنشاء إجراء تصحيحي جديد لتسجيل حالة عدم مطابقة
              </p>
            </div>
            <Link
              href="/qa/corrective-action/new"
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              إجراء تصحيحي جديد
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.open;
              return (
                <div
                  key={r.id}
                  className="border border-border bg-card rounded-2xl p-5 space-y-3 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                          {r.report_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {SOURCE_LABELS[r.source] ?? r.source}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                        {r.description}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {r.detected_by_name_snapshot && `أُنشئ بواسطة: ${r.detected_by_name_snapshot} · `}
                      {formatDateAr(r.detected_at)}
                    </span>
                    {r.workflow_instance_id && (
                      <Link
                        href={`/workflows/${r.workflow_instance_id}`}
                        className="text-primary hover:opacity-70 transition-opacity font-medium"
                      >
                        عرض الـ Workflow →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MigrationRequired() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8 flex items-center justify-center" dir="rtl">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-foreground">إعداد قاعدة البيانات مطلوب</h2>
        <p className="text-sm text-muted-foreground">
          يجب تطبيق Migration 42 أولاً:
        </p>
        <code className="block text-xs bg-muted rounded-xl p-3 text-right font-mono">
          db/migrations/20260527_layer6_nonconformance_reports.sql
        </code>
        <p className="text-xs text-muted-foreground">
          طبّق الملف في Supabase Dashboard ثم أعد تحميل الصفحة.
        </p>
      </div>
    </div>
  );
}
