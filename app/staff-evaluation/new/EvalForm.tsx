'use client';

import { useState, useTransition } from 'react';
import { useRouter }               from 'next/navigation';
import { Loader2, ChevronLeft }    from 'lucide-react';
import { createEvalAction }        from './_actions';
import type { StaffOption }        from '@/lib/services/staff-evaluation-service';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CRITERIA = [
  { id: 'job_performance',  label: 'جودة الأداء الوظيفي',     desc: 'إتقان المهام، دقة الإنجاز، الكفاءة التشغيلية', max: 30 },
  { id: 'commitment',       label: 'الالتزام والانضباط',       desc: 'الحضور، الالتزام بالمواعيد، الانضباط المهني',  max: 20 },
  { id: 'professional_dev', label: 'التطوير المهني',           desc: 'المبادرة بالتعلم، التدريب، تحديث المعرفة',     max: 20 },
  { id: 'collaboration',    label: 'التعاون والعلاقات',        desc: 'روح الفريق، التواصل، العلاقات المهنية',        max: 15 },
  { id: 'initiative',       label: 'الإبداع والمبادرة',        desc: 'الأفكار الجديدة، حل المشكلات، الفاعلية الذاتية', max: 15 },
] as const;

type CriterionId = (typeof CRITERIA)[number]['id'];

const MAX_TOTAL = CRITERIA.reduce((sum, c) => sum + c.max, 0); // 100

function getLevelInfo(pct: number): { label: string; color: string; barColor: string } {
  if (pct >= 90) return { label: 'ممتاز',         color: 'text-emerald-500', barColor: 'bg-emerald-500' };
  if (pct >= 80) return { label: 'جيد جداً',      color: 'text-blue-500',   barColor: 'bg-blue-500'   };
  if (pct >= 70) return { label: 'جيد',           color: 'text-sky-500',    barColor: 'bg-sky-500'    };
  if (pct >= 60) return { label: 'مقبول',         color: 'text-amber-500',  barColor: 'bg-amber-500'  };
  return              { label: 'يحتاج تحسيناً', color: 'text-rose-500',   barColor: 'bg-rose-500'   };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EvalForm({ staffList }: { staffList: StaffOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [academicYear,      setAcademicYear]      = useState(`${currentYear}-${currentYear + 1}`);
  const [periodStart,       setPeriodStart]       = useState('');
  const [periodEnd,         setPeriodEnd]         = useState('');
  const [evalNotes,         setEvalNotes]         = useState('');
  const [devPlan,           setDevPlan]           = useState('');

  const [scores, setScores] = useState<Record<CriterionId, number>>({
    job_performance:  0,
    commitment:       0,
    professional_dev: 0,
    collaboration:    0,
    initiative:       0,
  });

  const total      = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage = Math.round((total / MAX_TOTAL) * 100);
  const level      = getLevelInfo(percentage);

  const selectedStaff = staffList.find(s => s.persona_id === selectedPersonaId);

  function handleScore(id: CriterionId, maxVal: number, raw: string) {
    const n = Math.min(maxVal, Math.max(0, parseInt(raw) || 0));
    setScores(prev => ({ ...prev, [id]: n }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPersonaId || !selectedStaff) {
      setError('يرجى اختيار الموظف المُقيَّم');
      return;
    }
    if (!academicYear.trim()) {
      setError('يرجى إدخال السنة الدراسية');
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createEvalAction({
        evaluatee_persona_id:    selectedPersonaId,
        evaluatee_name_snapshot: selectedStaff.full_name,
        evaluatee_role_snapshot: selectedStaff.role,
        academic_year:           academicYear.trim(),
        evaluation_period_start: periodStart || null,
        evaluation_period_end:   periodEnd   || null,
        scores:                  scores,
        total_score:             total,
        max_score:               MAX_TOTAL,
        evaluator_notes:         evalNotes.trim() || null,
        development_plan:        devPlan.trim()   || null,
      });

      if (result.ok) {
        router.push('/staff-evaluation');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">

      {/* الموظف المُقيَّم */}
      <div className="border border-border rounded-2xl bg-card p-5 space-y-4">
        <h2 className="font-bold text-sm text-foreground">بيانات التقييم</h2>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">الموظف المُقيَّم *</label>
          <select
            value={selectedPersonaId}
            onChange={e => setSelectedPersonaId(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            required
          >
            <option value="">— اختر موظفاً —</option>
            {staffList.map(s => (
              <option key={s.persona_id} value={s.persona_id}>
                {s.full_name} — {getRoleInfo(s.role as UserRole).labelAr}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">السنة الدراسية *</label>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2025-2026"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">بداية فترة التقييم</label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">نهاية فترة التقييم</label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              min={periodStart || undefined}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>
      </div>

      {/* نموذج التقييم */}
      <div className="border border-border rounded-2xl bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-foreground">معايير التقييم</h2>
          <div className="text-left space-y-0.5">
            <p className={`text-xl font-black ${level.color}`}>{percentage}%</p>
            <p className={`text-xs font-bold ${level.color}`}>{level.label}</p>
          </div>
        </div>

        {/* شريط التقدم الكلي */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${level.barColor} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="space-y-4 pt-1">
          {CRITERIA.map(c => {
            const val  = scores[c.id];
            const pct  = Math.round((val / c.max) * 100);
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={c.max}
                      value={val}
                      onChange={e => handleScore(c.id, c.max, e.target.value)}
                      className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <span className="text-xs text-muted-foreground w-10">/ {c.max}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-sm font-bold text-muted-foreground">المجموع</span>
          <span className="text-lg font-black text-foreground">{total} / {MAX_TOTAL}</span>
        </div>
      </div>

      {/* الملاحظات وخطة التطوير */}
      <div className="border border-border rounded-2xl bg-card p-5 space-y-4">
        <h2 className="font-bold text-sm text-foreground">التغذية الراجعة</h2>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">ملاحظات المُقيِّم</label>
          <textarea
            value={evalNotes}
            onChange={e => setEvalNotes(e.target.value)}
            rows={3}
            placeholder="أبرز نقاط القوة والملاحظات..."
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">خطة التطوير المهني</label>
          <textarea
            value={devPlan}
            onChange={e => setDevPlan(e.target.value)}
            rows={3}
            placeholder="التوصيات والخطوات المقترحة للتحسين..."
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/staff-evaluation')}
          className="px-5 py-2.5 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          {isPending ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
        </button>
      </div>
    </form>
  );
}