'use client';

import { useState, useTransition } from 'react';
import { useRouter }               from 'next/navigation';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  getEmployeesByRoleAction,
  submitCorrectiveActionAction,
} from './_actions';
import type { ReasonCode, EmployeeOption } from '@/lib/services/wizard-service';
import type { SubmitCorrectiveActionInput } from '@/lib/services/wizard-service';
import { ROLE_LABELS } from '@/lib/workflow-labels';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_ROLES = [
  'teacher','academic_vp','student_affairs_vp','school_affairs_vp',
  'school_secretary','activity_leader','health_coordinator',
  'school_librarian','lab_technician','student_counselor',
  'quality_coordinator','school_admin',
] as const;

const SOURCE_LABELS: Record<string, string> = {
  internal_audit:    'مراجعة داخلية',
  external_audit:    'مراجعة خارجية',
  management_review: 'مراجعة الإدارة',
  complaint:         'شكوى / ملاحظة',
  observation:       'مشاهدة ميدانية',
  other:             'أخرى',
};

const SEVERITY_STYLES: Record<string, string> = {
  low:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium:   'bg-amber-500/10  text-amber-400  border-amber-500/20',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10    text-red-400    border-red-500/20',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'منخفض', medium: 'متوسط', high: 'عالٍ', critical: 'حرج',
};

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialReasonCodes: ReasonCode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard State
// ─────────────────────────────────────────────────────────────────────────────

interface WizardData {
  target_role:             string;
  target_persona_id:       string;
  reason_code:             string;
  source:                  SubmitCorrectiveActionInput['source'];
  iso_clause:              string;
  description:             string;
  corrective_action_plan:  string;
  due_date:                string;
}

const EMPTY: WizardData = {
  target_role: '', target_persona_id: '',
  reason_code: '', source: 'observation',
  iso_clause: '', description: '',
  corrective_action_plan: '', due_date: '',
};

const STEPS = ['الهدف', 'السبب', 'التفاصيل', 'المراجعة'];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CorrectiveActionWizard({ initialReasonCodes }: Props) {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [data, setData]       = useState<WizardData>(EMPTY);
  const [employees, setEmps]  = useState<EmployeeOption[]>([]);
  const [loadingEmps, startLoadEmps] = useTransition();
  const [submitting, startSubmit]    = useTransition();
  const [error, setError]     = useState<string | null>(null);

  const reasonCodes = initialReasonCodes;
  const selectedRC  = reasonCodes.find((r) => r.code === data.reason_code) ?? null;

  // ── Step 1: role change → fetch employees
  function handleRoleChange(role: string) {
    setData((d) => ({ ...d, target_role: role, target_persona_id: '' }));
    setEmps([]);
    if (!role) return;
    startLoadEmps(async () => {
      const res = await getEmployeesByRoleAction(role);
      if (res.ok) setEmps(res.data);
    });
  }

  // ── Navigation
  function canNext(): boolean {
    if (step === 0) return !!data.target_role && !!data.target_persona_id;
    if (step === 1) return !!data.reason_code;
    if (step === 2) return !!data.description.trim() && !!data.due_date;
    return true;
  }

  // ── Submit
  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const res = await submitCorrectiveActionAction({
        target_persona_id:      data.target_persona_id,
        reason_code:            data.reason_code,
        source:                 data.source,
        iso_clause:             data.iso_clause || undefined,
        description:            data.description,
        corrective_action_plan: data.corrective_action_plan || undefined,
        due_date:               data.due_date,
      });
      if (res.ok) {
        router.push(`/workflows/${res.data.instance_id}`);
      } else {
        setError(res.error);
      }
    });
  }

  // ── Derived UI
  const selectedEmployee = employees.find((e) => e.persona_id === data.target_persona_id);

  return (
    <div className="max-w-2xl mx-auto" dir="rtl">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0
              transition-all
              ${i < step  ? 'bg-sky-500 text-white' : ''}
              ${i === step ? 'bg-sky-500/20 text-sky-400 ring-2 ring-sky-500/40' : ''}
              ${i > step  ? 'bg-white/5 text-stone-400' : ''}
            `}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[11px] font-bold transition-colors ${i === step ? 'text-sky-400' : 'text-stone-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? 'bg-sky-500/50' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8 rounded-2xl min-h-[320px]">

        {/* Step 0 — اختيار الهدف */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">اختيار الموظف المستهدف</h2>
            <div className="space-y-3">
              <label className="text-xs font-bold opacity-60">الدور الوظيفي</label>
              <select
                value={data.target_role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full glass-panel rounded-xl px-4 py-3 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none"
              >
                <option value="">— اختر الدور —</option>
                {TARGET_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>

            {data.target_role && (
              <div className="space-y-3">
                <label className="text-xs font-bold opacity-60">الموظف</label>
                {loadingEmps ? (
                  <div className="flex items-center gap-2 text-xs opacity-50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ التحميل...
                  </div>
                ) : employees.length === 0 ? (
                  <p className="text-xs opacity-40">لا يوجد موظفون بهذا الدور</p>
                ) : (
                  <div className="space-y-2">
                    {employees.map((emp) => (
                      <button
                        key={emp.persona_id}
                        onClick={() => setData((d) => ({ ...d, target_persona_id: emp.persona_id }))}
                        className={`
                          w-full text-right px-4 py-3 rounded-xl border text-sm transition-all
                          ${data.target_persona_id === emp.persona_id
                            ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                            : 'border-stone-200 bg-white/3 hover:border-stone-200'}
                        `}
                      >
                        <span className="font-bold">{emp.full_name}</span>
                        {emp.job_title && (
                          <span className="text-xs opacity-50 mr-2">— {emp.job_title}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 1 — اختيار السبب */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">سبب عدم المطابقة</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {reasonCodes.map((rc) => (
                <button
                  key={rc.code}
                  onClick={() => setData((d) => ({ ...d, reason_code: rc.code }))}
                  className={`
                    w-full text-right px-4 py-3 rounded-xl border transition-all
                    ${data.reason_code === rc.code
                      ? 'border-sky-500/50 bg-sky-500/10'
                      : 'border-stone-200 bg-white/3 hover:border-stone-200'}
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black opacity-40 tracking-widest">{rc.code}</span>
                      <p className="text-sm font-bold mt-0.5">{rc.label_ar}</p>
                      {rc.iso_clause && (
                        <p className="text-[10px] opacity-40 mt-1">ISO {rc.iso_clause}</p>
                      )}
                    </div>
                    {rc.severity && (
                      <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border ${SEVERITY_STYLES[rc.severity] ?? ''}`}>
                        {SEVERITY_LABELS[rc.severity] ?? rc.severity}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {selectedRC?.default_action && (
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300">
                <span className="font-black opacity-60">الإجراء المقترح: </span>
                {selectedRC.default_action}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — التفاصيل */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">تفاصيل عدم المطابقة</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold opacity-60">مصدر الاكتشاف</label>
                <select
                  value={data.source}
                  onChange={(e) => setData((d) => ({ ...d, source: e.target.value as SubmitCorrectiveActionInput['source'] }))}
                  className="w-full glass-panel rounded-xl px-3 py-2.5 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none"
                >
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold opacity-60">تاريخ الإنجاز المطلوب</label>
                <input
                  type="date"
                  value={data.due_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setData((d) => ({ ...d, due_date: e.target.value }))}
                  className="w-full glass-panel rounded-xl px-3 py-2.5 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold opacity-60">البند المرجعي (ISO) — اختياري</label>
              <input
                type="text"
                value={data.iso_clause}
                placeholder="مثال: 10.2.1"
                onChange={(e) => setData((d) => ({ ...d, iso_clause: e.target.value }))}
                className="w-full glass-panel rounded-xl px-3 py-2.5 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold opacity-60">وصف عدم المطابقة <span className="text-red-400">*</span></label>
              <textarea
                value={data.description}
                onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                rows={3}
                placeholder="صف بدقة ما تم اكتشافه..."
                className="w-full glass-panel rounded-xl px-3 py-2.5 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold opacity-60">خطة الإجراء التصحيحي المقترحة — اختياري</label>
              <textarea
                value={data.corrective_action_plan}
                onChange={(e) => setData((d) => ({ ...d, corrective_action_plan: e.target.value }))}
                rows={2}
                placeholder="وصف الإجراء التصحيحي المطلوب..."
                className="w-full glass-panel rounded-xl px-3 py-2.5 text-sm bg-transparent border border-stone-200 focus:border-sky-500/50 outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3 — المراجعة */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">مراجعة وإرسال</h2>
            <div className="space-y-3 text-sm">
              <Row label="الموظف المستهدف" value={selectedEmployee?.full_name ?? '—'} />
              <Row label="الدور"            value={ROLE_LABELS[data.target_role] ?? data.target_role} />
              <Row label="السبب"            value={`${data.reason_code} — ${selectedRC?.label_ar ?? '—'}`} />
              {selectedRC?.severity && (
                <Row
                  label="مستوى الخطورة"
                  value={
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${SEVERITY_STYLES[selectedRC.severity] ?? ''}`}>
                      {SEVERITY_LABELS[selectedRC.severity]}
                    </span>
                  }
                />
              )}
              <Row label="المصدر"           value={SOURCE_LABELS[data.source]} />
              {data.iso_clause && <Row label="بند ISO"          value={data.iso_clause} />}
              <Row label="تاريخ الإنجاز"   value={data.due_date} />
              <Row label="الوصف"            value={data.description} multiline />
              {data.corrective_action_plan && (
                <Row label="خطة التصحيح" value={data.corrective_action_plan} multiline />
              )}
            </div>

            <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/15 text-xs text-sky-300/80">
              عند الإرسال سيُطلق مسار الإجراء التصحيحي وسيصل إشعار للموظف المستهدف بانتظار إقراره.
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => { setError(null); setStep((s) => s - 1); }}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl glass-panel border border-stone-200 hover:border-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" /> السابق
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => { setError(null); setStep((s) => s + 1); }}
            disabled={!canNext()}
            className="flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            التالي <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canNext()}
            className="flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ الإرسال...</>
              : <><Check className="w-3.5 h-3.5" /> إطلاق الإجراء التصحيحي</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-component
// ─────────────────────────────────────────────────────────────────────────────

function Row({
  label, value, multiline,
}: { label: string; value: React.ReactNode; multiline?: boolean }) {
  return (
    <div className={`flex ${multiline ? 'flex-col gap-1' : 'items-start gap-3'}`}>
      <span className="text-xs opacity-40 shrink-0 w-32">{label}</span>
      <span className={`font-bold ${multiline ? 'text-xs opacity-70 whitespace-pre-wrap' : ''}`}>
        {value}
      </span>
    </div>
  );
}
