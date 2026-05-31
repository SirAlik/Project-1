'use client';

import React, { useState, useTransition, useEffect } from 'react';
import {
  Zap, Plus, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  getRulesAction, toggleRuleAction, createRuleAction,
  deleteRuleAction, type AutomationRule, type CreateRuleInput,
} from './_actions';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_EVENTS = [
  { value: 'absence_count',   label: 'عدد الغيابات',        hint: '{"threshold":5,"period":"academic_year"}' },
  { value: 'late_count',      label: 'عدد التأخرات',         hint: '{"threshold":3,"period":"week"}' },
  { value: 'period_absence',  label: 'غياب الحصص',          hint: '{"threshold":10}' },
  { value: 'behavior_type',   label: 'سلوك متكرر',           hint: '{"threshold":3}' },
  { value: 'loan_overdue',    label: 'تأخر إعادة كتاب',      hint: '{"days":3}' },
  { value: 'health_referral', label: 'إحالة صحية',          hint: '{}' },
];

const ACTIONS = [
  { value: 'create_referral', label: 'إنشاء إحالة سلوكية', hint: '{}' },
  { value: 'notify_role',     label: 'إشعار دور',           hint: '{"role":"student_affairs_vp"}' },
  { value: 'notify_parent',   label: 'إشعار ولي الأمر',     hint: '{}' },
  { value: 'create_case',     label: 'فتح حالة إرشادية',    hint: '{}' },
  { value: 'flag_risk',       label: 'تصنيف خطر',           hint: '{}' },
];

// ─────────────────────────────────────────────────────────────────────────────
// New Rule Form
// ─────────────────────────────────────────────────────────────────────────────

function NewRuleForm({
  schoolId,
  onCreated,
  onCancel,
}: {
  schoolId: string;
  onCreated: (rule: AutomationRule) => void;
  onCancel:  () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CreateRuleInput, 'school_id'>>({
    name:          '',
    trigger_event: 'absence_count',
    condition:     { threshold: 5, period: 'academic_year' },
    action:        'notify_role',
    action_config: { role: 'student_affairs_vp' },
  });

  const [conditionText, setConditionText] = useState(
    JSON.stringify(form.condition, null, 2),
  );
  const [actionConfigText, setActionConfigText] = useState(
    JSON.stringify(form.action_config, null, 2),
  );

  function handleTriggerChange(v: string) {
    const hint = TRIGGER_EVENTS.find(t => t.value === v)?.hint ?? '{}';
    const parsed = JSON.parse(hint);
    setConditionText(JSON.stringify(parsed, null, 2));
    setForm(f => ({ ...f, trigger_event: v, condition: parsed }));
  }

  function handleActionChange(v: string) {
    const hint = ACTIONS.find(a => a.value === v)?.hint ?? '{}';
    const parsed = JSON.parse(hint);
    setActionConfigText(JSON.stringify(parsed, null, 2));
    setForm(f => ({ ...f, action: v, action_config: parsed }));
  }

  function submit() {
    let condition: Record<string, unknown>;
    let action_config: Record<string, unknown>;

    try {
      condition     = JSON.parse(conditionText);
      action_config = JSON.parse(actionConfigText);
    } catch {
      setError('صيغة JSON غير صحيحة في الشرط أو الإجراء');
      return;
    }

    if (!form.name.trim()) {
      setError('الاسم مطلوب');
      return;
    }

    startTransition(async () => {
      setError(null);
      const res = await createRuleAction({
        school_id: schoolId,
        ...form,
        condition,
        action_config,
      });

      if (res.ok) onCreated(res.data);
      else setError(res.error);
    });
  }

  return (
    <div className="surface-block p-6 border-primary/30 animate-in fade-in slide-in-from-top-4" dir="rtl">
      <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
        <Plus className="w-4 h-4 text-primary" /> قاعدة جديدة
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">الاسم</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="مثال: تنبيه غياب أسبوعي"
            className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
        </div>

        {/* Trigger */}
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">الحدث المُشغِّل</label>
          <select
            value={form.trigger_event}
            onChange={e => handleTriggerChange(e.target.value)}
            className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {TRIGGER_EVENTS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">الإجراء</label>
          <select
            value={form.action}
            onChange={e => handleActionChange(e.target.value)}
            className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* Condition JSON */}
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">الشرط (JSON)</label>
          <textarea
            value={conditionText}
            onChange={e => setConditionText(e.target.value)}
            rows={4}
            className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Action Config JSON */}
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">إعداد الإجراء (JSON)</label>
          <textarea
            value={actionConfigText}
            onChange={e => setActionConfigText(e.target.value)}
            rows={4}
            className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isPending ? 'جارٍ الحفظ...' : 'حفظ القاعدة'}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-colors surface-block"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule Row
// ─────────────────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule:     AutomationRule;
  onToggle: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const triggerLabel = TRIGGER_EVENTS.find(t => t.value === rule.trigger_event)?.label ?? rule.trigger_event;
  const actionLabel  = ACTIONS.find(a => a.value === rule.action)?.label ?? rule.action;

  return (
    <div className={`surface-block transition-colors ${rule.is_active ? '' : 'opacity-50'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.is_active ? 'bg-primary' : 'bg-text-secondary'}`} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{rule.name}</p>
            <p className="text-[10px] text-text-secondary mt-0.5">
              <span className="text-accent">{triggerLabel}</span>
              <span className="mx-1 opacity-40">←</span>
              <span className="text-primary">{actionLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-surface/50 text-text-secondary transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onToggle(rule.id, !rule.is_active)}
            className="text-text-secondary hover:text-primary transition-colors"
            title={rule.is_active ? 'إيقاف' : 'تفعيل'}
          >
            {rule.is_active
              ? <ToggleRight className="w-6 h-6 text-primary" />
              : <ToggleLeft  className="w-6 h-6" />}
          </button>

          <button
            onClick={() => onDelete(rule.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-text-secondary hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border-subtle px-4 pb-4 pt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">الشرط</p>
            <pre className="text-[10px] font-mono bg-bg-surface/30 rounded-lg p-3 text-text-secondary overflow-x-auto">
              {JSON.stringify(rule.condition, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">إعداد الإجراء</p>
            <pre className="text-[10px] font-mono bg-bg-surface/30 rounded-lg p-3 text-text-secondary overflow-x-auto">
              {JSON.stringify(rule.action_config, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  schools:         { id: string; name: string }[];
  initialSchoolId: string;
}

export function AutomationRulesClient({ schools, initialSchoolId }: Props) {
  const [schoolId,   setSchoolId]   = useState(initialSchoolId);
  const [rules,      setRules]      = useState<AutomationRule[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [isPending,  startTransition] = useTransition();

  // جلب القواعد عند تغيير المدرسة
  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      const res = await getRulesAction(schoolId);
      setRules(res.ok ? res.data : []);
      setLoading(false);
    });
  }, [schoolId]);

  function handleToggle(id: string, next: boolean) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: next } : r));
    startTransition(async () => { await toggleRuleAction(id, next); });
  }

  function handleDelete(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
    startTransition(async () => { await deleteRuleAction(id); });
  }

  function handleCreated(rule: AutomationRule) {
    setRules(prev => [rule, ...prev]);
    setShowForm(false);
  }

  const active   = rules.filter(r => r.is_active).length;
  const inactive = rules.length - active;

  return (
    <div className="space-y-6" dir="rtl">
      {/* School Selector */}
      {schools.length > 1 && (
        <div>
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">المدرسة</label>
          <select
            value={schoolId}
            onChange={e => setSchoolId(e.target.value)}
            className="bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 text-[11px] font-bold">
        <span className="surface-block px-4 py-2 rounded-xl flex items-center gap-2">
          <span className="text-primary">{active}</span>
          <span className="text-text-secondary">قاعدة نشطة</span>
        </span>
        {inactive > 0 && (
          <span className="surface-block px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-text-secondary">{inactive}</span>
            <span className="text-text-secondary">موقوفة</span>
          </span>
        )}
      </div>

      {/* New Rule Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> إضافة قاعدة
        </button>
      )}

      {/* New Rule Form */}
      {showForm && (
        <NewRuleForm
          schoolId={schoolId}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Rules List */}
      {loading || isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="surface-block p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="surface-block p-12 text-center text-text-secondary">
          <Zap className="w-10 h-10 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-bold">لا توجد قواعد بعد</p>
          <p className="text-xs mt-1">أضف قاعدة أولى لتبدأ الأتمتة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
