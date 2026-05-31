'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, PenLine, Plus, Trash2 } from 'lucide-react';
import { startMeetingAction, endMeetingAction, signMinutesAction } from './_actions';
import type { ActionItemInput } from '@/lib/services/meeting-service';

// ── بدء الاجتماع
export function StartMeetingButton({ meetingId }: { meetingId: string }) {
  const router              = useRouter();
  const [isPending, startT] = useTransition();
  const [error, setError]   = useState<string | null>(null);

  const handle = () => {
    setError(null);
    startT(async () => {
      const result = await startMeetingAction(meetingId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
      <button
        onClick={handle}
        disabled={isPending}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-emerald-500/20 transition-all"
      >
        <Play className="w-4 h-4" />
        {isPending ? 'جارٍ البدء...' : 'بدء الاجتماع'}
      </button>
    </div>
  );
}

// ── إنهاء الاجتماع (نموذج)
export function EndMeetingForm({ meetingId }: { meetingId: string }) {
  const router              = useRouter();
  const [isPending, startT] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [open, setOpen]     = useState(false);

  const [minutes, setMinutes]           = useState('');
  const [decisions, setDecisions]       = useState<string[]>(['']);
  const [recommendations, setRecos]     = useState<string[]>(['']);
  const [actionItems]                   = useState<ActionItemInput[]>([]);

  const addDecision    = () => setDecisions((p) => [...p, '']);
  const addReco        = () => setRecos((p) => [...p, '']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes.trim()) return setError('ملخص المحضر مطلوب');
    setError(null);

    startT(async () => {
      const result = await endMeetingAction(meetingId, {
        minutes:         minutes.trim(),
        decisions:       decisions.filter((d) => d.trim()),
        recommendations: recommendations.filter((r) => r.trim()),
        action_items:    actionItems,
      });

      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-amber-500/20 transition-all"
      >
        <Square className="w-4 h-4" />
        إنهاء الاجتماع وإصدار المحضر
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl space-y-6" dir="rtl">
      <h3 className="text-sm font-black">إنهاء الاجتماع وتحرير المحضر</h3>

      {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

      {/* ملخص المحضر */}
      <div className="space-y-2">
        <label className="text-xs font-bold opacity-60">ملخص المحضر *</label>
        <textarea
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          rows={4}
          placeholder="ملخص ما دار في الاجتماع..."
          className="w-full glass-panel rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          required
        />
      </div>

      {/* القرارات */}
      <div className="space-y-3">
        <label className="text-xs font-bold opacity-60">القرارات المتخذة</label>
        {decisions.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={d}
              onChange={(e) => setDecisions((p) => p.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`القرار ${i + 1}`}
              className="flex-1 glass-panel rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {decisions.length > 1 && (
              <button type="button" onClick={() => setDecisions((p) => p.filter((_, idx) => idx !== i))}
                className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center opacity-40 hover:text-red-400 hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addDecision}
          className="flex items-center gap-1.5 text-xs font-bold opacity-40 hover:opacity-80 transition-opacity">
          <Plus className="w-3 h-3" /> قرار جديد
        </button>
      </div>

      {/* التوصيات */}
      <div className="space-y-3">
        <label className="text-xs font-bold opacity-60">التوصيات</label>
        {recommendations.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={r}
              onChange={(e) => setRecos((p) => p.map((v, idx) => idx === i ? e.target.value : v))}
              placeholder={`التوصية ${i + 1}`}
              className="flex-1 glass-panel rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {recommendations.length > 1 && (
              <button type="button" onClick={() => setRecos((p) => p.filter((_, idx) => idx !== i))}
                className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center opacity-40 hover:text-red-400 hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addReco}
          className="flex items-center gap-1.5 text-xs font-bold opacity-40 hover:opacity-80 transition-opacity">
          <Plus className="w-3 h-3" /> توصية جديدة
        </button>
      </div>

      {/* أزرار */}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={() => setOpen(false)}
          className="glass-panel px-5 py-2.5 rounded-xl text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <PenLine className="w-4 h-4" />
          {isPending ? 'جارٍ الحفظ...' : 'إصدار المحضر والإخطار بالتوقيع'}
        </button>
      </div>
    </form>
  );
}

// ── توقيع المحضر
export function SignMinutesButton({ meetingId }: { meetingId: string }) {
  const router              = useRouter();
  const [isPending, startT] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [done, setDone]     = useState(false);

  const handle = () => {
    setError(null);
    startT(async () => {
      const result = await signMinutesAction(meetingId);
      if (result.ok) { setDone(true); router.refresh(); }
      else setError(result.error);
    });
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
        <span className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center text-[10px]">✓</span>
        تم التوقيع
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
      <button
        onClick={handle}
        disabled={isPending}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-sky-500/20 transition-all"
      >
        <PenLine className="w-4 h-4" />
        {isPending ? 'جارٍ التوقيع...' : 'توقيع المحضر رقمياً'}
      </button>
    </div>
  );
}
