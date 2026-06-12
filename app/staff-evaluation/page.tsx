import type { Metadata }    from 'next';
import Link                 from 'next/link';
import { redirect }         from 'next/navigation';
import { Plus, ClipboardCheck, Clock, CheckCircle2, FileText, XCircle } from 'lucide-react';
import { getActivePersona } from '@/lib/auth/context-service';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'تقييمات الأداء — سِدرة' };

interface EvalRow {
  id: string;
  evaluation_number: string;
  academic_year: string;
  evaluatee_name_snapshot: string;
  evaluatee_role_snapshot: string;
  evaluator_name_snapshot: string | null;
  percentage: number | null;
  performance_level: string | null;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:        { label: 'مسودة',               color: 'text-muted-foreground bg-muted border-border',               icon: <Clock          className="w-3 h-3" /> },
  completed:    { label: 'بانتظار الإقرار',      color: 'text-amber-500  bg-amber-500/10  border-amber-500/20',       icon: <Clock          className="w-3 h-3" /> },
  acknowledged: { label: 'مُقرّ به',             color: 'text-blue-500   bg-blue-500/10   border-blue-500/20',        icon: <CheckCircle2   className="w-3 h-3" /> },
  filed:        { label: 'محفوظ رسمياً',         color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',   icon: <FileText       className="w-3 h-3" /> },
  cancelled:    { label: 'ملغى',                 color: 'text-rose-500   bg-rose-500/10   border-rose-500/20',        icon: <XCircle        className="w-3 h-3" /> },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  excellent:         { label: 'ممتاز',         color: 'text-emerald-500' },
  very_good:         { label: 'جيد جداً',      color: 'text-blue-500'   },
  good:              { label: 'جيد',           color: 'text-sky-500'    },
  satisfactory:      { label: 'مقبول',         color: 'text-amber-500'  },
  needs_improvement: { label: 'يحتاج تحسيناً', color: 'text-rose-500'   },
};

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function StaffEvaluationListPage() {
  const persona = await getActivePersona();
  if (!persona || !persona.schoolId) redirect('/portal');

  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from('staff_evaluations')
    .select(
      'id, evaluation_number, academic_year, evaluatee_name_snapshot, evaluatee_role_snapshot, ' +
      'evaluator_name_snapshot, percentage, performance_level, status, created_at',
    )
    .eq('school_id', persona.schoolId)
    .order('created_at', { ascending: false });

  if (error && error.code === '42P01') {
    return <MigrationRequired />;
  }

  const items = (rows ?? []) as unknown as EvalRow[];

  const canCreate = ['school_principal', 'school_admin'].includes(persona.role);

  const counts = {
    total:        items.length,
    pending:      items.filter(r => r.status === 'completed').length,
    acknowledged: items.filter(r => r.status === 'acknowledged').length,
    filed:        items.filter(r => r.status === 'filed').length,
  };

  return (
    <div dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground mb-1">الموارد البشرية / تقييمات الأداء</p>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-blue-500" />
              تقييمات الأداء الوظيفي
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              تقييم وتطوير الكفاءات — ISO 9001:2015 بند 9.1.3
            </p>
          </div>
          {canCreate && (
            <Link
              href="/staff-evaluation/new"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              تقييم جديد
            </Link>
          )}
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'الإجمالي',          value: counts.total,        color: 'text-foreground'   },
            { label: 'بانتظار الإقرار',   value: counts.pending,      color: 'text-amber-500'    },
            { label: 'مُقرّ به',          value: counts.acknowledged, color: 'text-blue-500'     },
            { label: 'محفوظ رسمياً',      value: counts.filed,        color: 'text-emerald-500'  },
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
              <ClipboardCheck className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-bold text-foreground">لا توجد تقييمات بعد</p>
              <p className="text-sm text-muted-foreground mt-1">
                ابدأ بإنشاء تقييم أداء لأحد أعضاء الهيئة
              </p>
            </div>
            {canCreate && (
              <Link
                href="/staff-evaluation/new"
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                تقييم جديد
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.completed;
              const lvl = r.performance_level ? LEVEL_CONFIG[r.performance_level] : null;
              return (
                <div
                  key={r.id}
                  className="border border-border bg-card rounded-2xl p-5 space-y-3 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                          {r.evaluation_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getRoleInfo(r.evaluatee_role_snapshot as UserRole).labelAr}
                        </span>
                        <span className="text-xs text-muted-foreground">· {r.academic_year}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">{r.evaluatee_name_snapshot}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {r.percentage != null && (
                        <span className={`font-bold text-sm ${lvl?.color ?? 'text-foreground'}`}>
                          {r.percentage.toFixed(0)}% — {lvl?.label ?? ''}
                        </span>
                      )}
                      {r.evaluator_name_snapshot && (
                        <span>بقلم: {r.evaluator_name_snapshot}</span>
                      )}
                    </div>
                    <span>{formatDateAr(r.created_at)}</span>
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
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
          <ClipboardCheck className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-black text-foreground">إعداد قاعدة البيانات مطلوب</h2>
        <p className="text-sm text-muted-foreground">يجب تطبيق Migration 44 أولاً:</p>
        <code className="block text-xs bg-muted rounded-xl p-3 text-right font-mono">
          db/migrations/20260527_layer6_staff_evaluations.sql
        </code>
        <p className="text-xs text-muted-foreground">
          طبّق الملف في Supabase Dashboard ثم أعد تحميل الصفحة.
        </p>
      </div>
    </div>
  );
}
