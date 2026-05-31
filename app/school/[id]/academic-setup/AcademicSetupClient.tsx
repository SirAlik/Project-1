'use client';

import { useState, useTransition } from 'react';
import {
  Layers, Clock, CalendarDays, Plus, Trash2, Zap,
  CheckCircle2, Loader2, AlertCircle, BookOpen,
} from 'lucide-react';
import {
  createStage, deleteStage,
  createPeriod, createPeriodsQuick, deletePeriod,
  createTerm, setActiveTerm, deleteTerm,
  getPeriodsForStageAction,
} from '@/app/_actions/academic-setup';
import type { SchoolStage, Period, Term } from '@/lib/types/academic';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  schoolId:      string;
  initialStages: SchoolStage[];
  activeYear:    { id: string; name: string } | null;
  initialTerms:  Term[];
}

type Tab = 'stages' | 'periods' | 'terms';

const STAGE_PRESETS = [
  { code: 'elementary' as const, name: 'المرحلة الابتدائية', gradeFrom: 1, gradeTo: 6 },
  { code: 'middle'     as const, name: 'المرحلة المتوسطة',   gradeFrom: 7, gradeTo: 9 },
  { code: 'high'       as const, name: 'المرحلة الثانوية',   gradeFrom: 10, gradeTo: 12 },
];

const STAGE_LABELS: Record<string, string> = {
  elementary: 'ابتدائي',
  middle:     'متوسط',
  high:       'ثانوي',
};

const TERM_NAMES = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الثالث'];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Error/Success Banner
// ─────────────────────────────────────────────────────────────────────────────

function Banner({ msg, type }: { msg: string; type: 'error' | 'ok' }) {
  if (type === 'ok') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 rounded-xl px-4 py-2.5 border border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {msg}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5 border border-destructive/20">
      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stages Panel
// ─────────────────────────────────────────────────────────────────────────────

function StagesPanel({ schoolId, stages, onChanged }: {
  schoolId: string;
  stages: SchoolStage[];
  onChanged: (stages: SchoolStage[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'ok' } | null>(null);

  async function addPreset(preset: typeof STAGE_PRESETS[0]) {
    setMsg(null);
    startTransition(async () => {
      const res = await createStage({ schoolId, ...preset });
      if (res.ok) {
        setMsg({ text: `تمت إضافة ${preset.name}`, type: 'ok' });
        onChanged([...stages, {
          id: res.data.id, school_id: schoolId,
          name: preset.name, code: preset.code,
          grade_from: preset.gradeFrom, grade_to: preset.gradeTo,
        }]);
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  async function removeStage(id: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteStage(id, schoolId);
      if (res.ok) {
        setMsg({ text: 'تم حذف المرحلة', type: 'ok' });
        onChanged(stages.filter(s => s.id !== id));
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  const existingCodes = new Set(stages.map(s => s.code));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-4">
          إضافة مرحلة
        </p>
        <div className="grid grid-cols-3 gap-3">
          {STAGE_PRESETS.map(preset => (
            <button
              key={preset.code}
              onClick={() => addPreset(preset)}
              disabled={isPending || existingCodes.has(preset.code)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border text-sm font-bold transition-all ${
                existingCodes.has(preset.code)
                  ? 'bg-primary/10 border-primary/30 text-primary cursor-default'
                  : 'bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground disabled:opacity-40'
              }`}
            >
              {existingCodes.has(preset.code) ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              <span>{preset.name}</span>
              <span className="text-xs opacity-60 font-mono">
                {preset.gradeFrom} - {preset.gradeTo}
              </span>
            </button>
          ))}
        </div>
      </div>

      {msg && <Banner msg={msg.text} type={msg.type} />}

      {stages.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-3">
            المراحل المُضافة
          </p>
          <div className="space-y-2">
            {stages.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
                <div>
                  <span className="font-bold text-sm">{s.name}</span>
                  <span className="mr-3 text-xs text-muted-foreground font-mono">
                    الصف {s.grade_from} – {s.grade_to}
                  </span>
                </div>
                <button
                  onClick={() => removeStage(s.id)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stages.length === 0 && !isPending && (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <Layers className="w-8 h-8 opacity-20" />
          <p className="text-sm font-bold">اضغط على مرحلة لإضافتها</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Periods Panel
// ─────────────────────────────────────────────────────────────────────────────

function PeriodsPanel({ schoolId, stages }: { schoolId: string; stages: SchoolStage[] }) {
  const [isPending, startTransition] = useTransition();
  const [selectedStageId, setSelectedStageId] = useState(stages[0]?.id ?? '');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'ok' } | null>(null);
  const [form, setForm] = useState({ startTime: '', endTime: '' });

  async function loadPeriods(stageId: string) {
    if (!stageId) return;
    setLoadingPeriods(true);
    const data = await getPeriodsForStageAction(stageId);
    setPeriods(data as Period[]);
    setLoadingPeriods(false);
  }

  function handleStageChange(id: string) {
    setSelectedStageId(id);
    setMsg(null);
    loadPeriods(id);
  }

  async function handleQuickSetup() {
    if (!selectedStageId) return;
    setMsg(null);
    startTransition(async () => {
      const res = await createPeriodsQuick(selectedStageId, schoolId);
      if (res.ok) {
        setMsg({ text: `تم إعداد الحصص الافتراضية (8 حصص)`, type: 'ok' });
        await loadPeriods(selectedStageId);
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  async function handleAddPeriod() {
    if (!selectedStageId) return;
    const nextNum = (periods[periods.length - 1]?.number ?? 0) + 1;
    setMsg(null);
    startTransition(async () => {
      const res = await createPeriod({
        schoolId,
        stageId:   selectedStageId,
        number:    nextNum,
        label:     `الحصة ${arabicOrdinal(nextNum)}`,
        startTime: form.startTime || null,
        endTime:   form.endTime   || null,
      });
      if (res.ok) {
        setMsg({ text: `تمت إضافة الحصة ${nextNum}`, type: 'ok' });
        await loadPeriods(selectedStageId);
        setForm({ startTime: '', endTime: '' });
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  async function handleDeletePeriod(periodId: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await deletePeriod(periodId, schoolId);
      if (res.ok) {
        setPeriods(prev => prev.filter(p => p.id !== periodId));
        setMsg({ text: 'تم حذف الحصة', type: 'ok' });
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <BookOpen className="w-8 h-8 opacity-20" />
        <p className="text-sm font-bold">أضف مرحلة دراسية أولاً من تبويب &quot;المراحل&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stage Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-muted-foreground">المرحلة:</span>
        <div className="flex gap-2">
          {stages.map(s => (
            <button
              key={s.id}
              onClick={() => handleStageChange(s.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedStageId === s.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50 text-foreground'
              }`}
            >
              {STAGE_LABELS[s.code] ?? s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Setup */}
      {selectedStageId && periods.length === 0 && !loadingPeriods && (
        <button
          onClick={handleQuickSetup}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-primary/30 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-all disabled:opacity-40"
        >
          <Zap className="w-4 h-4" />
          إعداد سريع — 8 حصص بأوقات المدارس السعودية
        </button>
      )}

      {msg && <Banner msg={msg.text} type={msg.type} />}

      {/* Periods List */}
      {loadingPeriods ? (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : periods.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
            الحصص — {periods.length} حصة
          </p>
          {periods.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl">
              <span className="w-6 text-center text-xs text-muted-foreground font-mono">{p.number}</span>
              <span className="flex-1 text-sm font-bold">{p.label}</span>
              {p.start_time && p.end_time && (
                <span className="text-xs text-muted-foreground font-mono direction-ltr">
                  {p.start_time.slice(0, 5)} – {p.end_time.slice(0, 5)}
                </span>
              )}
              <button
                onClick={() => handleDeletePeriod(p.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add Period Form */}
      {selectedStageId && periods.length > 0 && (
        <div className="border border-border rounded-2xl bg-card p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground">إضافة حصة جديدة</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">وقت البداية</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">وقت النهاية</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAddPeriod}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة الحصة {(periods[periods.length - 1]?.number ?? 0) + 1}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Terms Panel
// ─────────────────────────────────────────────────────────────────────────────

function TermsPanel({ schoolId, activeYear, initialTerms }: {
  schoolId:   string;
  activeYear: { id: string; name: string } | null;
  initialTerms: Term[];
}) {
  const [isPending, startTransition] = useTransition();
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'ok' } | null>(null);
  const [form, setForm] = useState({ startDate: '', endDate: '' });

  if (!activeYear) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <CalendarDays className="w-8 h-8 opacity-20" />
        <p className="text-sm font-bold">لا توجد سنة دراسية نشطة</p>
      </div>
    );
  }

  const existingNums = new Set(terms.map(t => t.number));
  const nextNum = ([1, 2, 3] as const).find(n => !existingNums.has(n));

  async function handleAddTerm() {
    if (!nextNum || !activeYear) return;
    const year = activeYear;
    setMsg(null);
    startTransition(async () => {
      const res = await createTerm({
        schoolId,
        academicYearId: year.id,
        number:         nextNum,
        name:           TERM_NAMES[nextNum - 1],
        startDate:      form.startDate || null,
        endDate:        form.endDate   || null,
      });
      if (res.ok) {
        setMsg({ text: `تمت إضافة ${TERM_NAMES[nextNum - 1]}`, type: 'ok' });
        setTerms(prev => [...prev, {
          id:               res.data.id,
          school_id:        schoolId,
          academic_year_id: year.id,
          number:           nextNum,
          name:             TERM_NAMES[nextNum - 1],
          start_date:       form.startDate || null,
          end_date:         form.endDate   || null,
          is_active:        false,
        }].sort((a, b) => a.number - b.number));
        setForm({ startDate: '', endDate: '' });
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  async function handleActivate(termId: string) {
    if (!activeYear) return;
    const year = activeYear;
    setMsg(null);
    startTransition(async () => {
      const res = await setActiveTerm(termId, schoolId, year.id);
      if (res.ok) {
        setTerms(prev => prev.map(t => ({ ...t, is_active: t.id === termId })));
        setMsg({ text: 'تم تفعيل الفصل الدراسي', type: 'ok' });
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  async function handleDeleteTerm(termId: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await deleteTerm(termId, schoolId);
      if (res.ok) {
        setTerms(prev => prev.filter(t => t.id !== termId));
        setMsg({ text: 'تم حذف الفصل الدراسي', type: 'ok' });
      } else {
        setMsg({ text: res.error, type: 'error' });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
        <CalendarDays className="w-4 h-4" />
        السنة الدراسية: <span className="text-foreground">{activeYear.name}</span>
      </div>

      {msg && <Banner msg={msg.text} type={msg.type} />}

      {/* Terms List */}
      {terms.length > 0 && (
        <div className="space-y-2">
          {terms.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                t.is_active
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{t.name}</span>
                  {t.is_active && (
                    <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black">
                      نشط
                    </span>
                  )}
                </div>
                {t.start_date && t.end_date && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {t.start_date} – {t.end_date}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!t.is_active && (
                  <button
                    onClick={() => handleActivate(t.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                  >
                    تفعيل
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTerm(t.id)}
                  disabled={isPending || t.is_active}
                  title={t.is_active ? 'لا يمكن حذف الفصل النشط' : ''}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Term Form */}
      {nextNum && (
        <div className="border border-border rounded-2xl bg-card p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground">
            إضافة: {TERM_NAMES[nextNum - 1]}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">تاريخ البداية</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">تاريخ النهاية</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAddTerm}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة الفصل {nextNum}
          </button>
        </div>
      )}

      {terms.length === 0 && !nextNum && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          تم إعداد جميع الفصول الدراسية الثلاثة ✓
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────────────────────────

export function AcademicSetupClient({ schoolId, initialStages, activeYear, initialTerms }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('stages');
  const [stages, setStages] = useState<SchoolStage[]>(initialStages);

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'stages',  label: 'المراحل الدراسية', icon: <Layers className="w-4 h-4" />,      badge: stages.length },
    { key: 'periods', label: 'الحصص وأوقاتها',   icon: <Clock className="w-4 h-4" /> },
    { key: 'terms',   label: 'الفصول الدراسية',  icon: <CalendarDays className="w-4 h-4" />, badge: initialTerms.length },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
      {/* Tab Sidebar */}
      <div className="space-y-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-right transition-all ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {tab.icon}
            <span className="flex-1">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="border border-border rounded-3xl bg-card p-6">
        {activeTab === 'stages' && (
          <StagesPanel schoolId={schoolId} stages={stages} onChanged={setStages} />
        )}
        {activeTab === 'periods' && (
          <PeriodsPanel schoolId={schoolId} stages={stages} />
        )}
        {activeTab === 'terms' && (
          <TermsPanel schoolId={schoolId} activeYear={activeYear} initialTerms={initialTerms} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function arabicOrdinal(n: number): string {
  const ordinals = ['', 'الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة',
                    'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  return ordinals[n] ?? `${n}`;
}
