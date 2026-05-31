'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Users, Plus, X, ChevronLeft } from 'lucide-react';
import { getInviteeOptionsAction, createMeetingAction } from './_actions';
import type { MeetingInviteeOption } from '@/lib/services/meeting-service';
import { ROLE_LABELS } from '@/lib/workflow-labels';

const MEETING_TYPES: Record<string, string> = {
  regular:           'اجتماع دوري',
  emergency:         'اجتماع طارئ',
  specialized:       'اجتماع متخصص',
  management_review: 'مراجعة الإدارة',
  other:             'أخرى',
};

export function NewMeetingForm() {
  const router                         = useRouter();
  const [isPending, startTransition]   = useTransition();
  const [error, setError]              = useState<string | null>(null);
  const [invitees, setInvitees]        = useState<MeetingInviteeOption[]>([]);
  const [loadingInvitees, setLoadingInvitees] = useState(true);

  // حقول النموذج
  const [title, setTitle]              = useState('');
  const [meetingType, setMeetingType]  = useState<string>('regular');
  const [scheduledDate, setDate]       = useState('');
  const [startTime, setStartTime]      = useState('');
  const [endTime, setEndTime]          = useState('');
  const [location, setLocation]        = useState('');
  const [agendaItems, setAgendaItems]  = useState<string[]>(['']);
  const [selectedIds, setSelectedIds]  = useState<string[]>([]);

  useEffect(() => {
    getInviteeOptionsAction().then((res) => {
      if (res.ok) setInvitees(res.data);
      setLoadingInvitees(false);
    });
  }, []);

  const toggleInvitee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const addAgendaItem = () => setAgendaItems((prev) => [...prev, '']);
  const removeAgendaItem = (i: number) =>
    setAgendaItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateAgendaItem = (i: number, val: string) =>
    setAgendaItems((prev) => prev.map((item, idx) => (idx === i ? val : item)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim())        return setError('عنوان الاجتماع مطلوب');
    if (!scheduledDate)       return setError('تاريخ الاجتماع مطلوب');
    if (!startTime)           return setError('وقت البداية مطلوب');

    const filledItems = agendaItems.filter((a) => a.trim());

    startTransition(async () => {
      const result = await createMeetingAction({
        title:               title.trim(),
        meeting_type:        meetingType as never,
        scheduled_date:      scheduledDate,
        start_time:          startTime,
        end_time:            endTime || undefined,
        location:            location.trim() || undefined,
        agenda_items:        filledItems,
        invitee_persona_ids: selectedIds,
      });

      if (result.ok) {
        router.push(`/meetings/${result.data.meeting_id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* العنوان والنوع */}
      <div className="glass-card p-6 rounded-2xl space-y-5">
        <h3 className="text-sm font-black opacity-60 uppercase tracking-widest">معلومات الاجتماع</h3>

        <div className="space-y-2">
          <label className="text-xs font-bold opacity-60">عنوان الاجتماع *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: اجتماع مجلس الهيئة التدريسية — الفصل الثاني"
            className="w-full glass-panel rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold opacity-60">نوع الاجتماع</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(MEETING_TYPES).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMeetingType(key)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                  meetingType === key
                    ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/20'
                    : 'glass-panel border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* التوقيت والموقع */}
      <div className="glass-card p-6 rounded-2xl space-y-5">
        <h3 className="text-sm font-black opacity-60 uppercase tracking-widest">التوقيت والموقع</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold opacity-60 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> التاريخ *
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full glass-panel rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold opacity-60 flex items-center gap-1">
              <Clock className="w-3 h-3" /> وقت البداية *
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full glass-panel rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold opacity-60 flex items-center gap-1">
              <Clock className="w-3 h-3" /> وقت الانتهاء
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full glass-panel rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold opacity-60 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> موقع الاجتماع
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="مثال: قاعة الاجتماعات الرئيسية"
            className="w-full glass-panel rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      {/* جدول الأعمال */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-black opacity-60 uppercase tracking-widest">جدول الأعمال</h3>

        <div className="space-y-3">
          {agendaItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs font-black opacity-30 w-5 text-center shrink-0">{i + 1}</span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateAgendaItem(i, e.target.value)}
                placeholder={`البند ${i + 1}`}
                className="flex-1 glass-panel rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              {agendaItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAgendaItem(i)}
                  className="shrink-0 w-8 h-8 rounded-lg glass-panel flex items-center justify-center opacity-40 hover:opacity-100 hover:text-red-400 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAgendaItem}
          className="flex items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة بند
        </button>
      </div>

      {/* المدعوون */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" />
          المدعوون
          {selectedIds.length > 0 && (
            <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full text-[10px] font-black">
              {selectedIds.length} محدد
            </span>
          )}
        </h3>

        {loadingInvitees ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl glass-panel animate-pulse" />
            ))}
          </div>
        ) : invitees.length === 0 ? (
          <p className="text-xs opacity-40 text-center py-4">لا يوجد موظفون آخرون في المدرسة</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {invitees.map((inv) => {
              const selected = selectedIds.includes(inv.persona_id);
              return (
                <button
                  key={inv.persona_id}
                  type="button"
                  onClick={() => toggleInvitee(inv.persona_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right ${
                    selected
                      ? 'bg-sky-500/15 border border-sky-500/40'
                      : 'glass-panel border border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                      selected ? 'bg-sky-500 border-sky-500' : 'border-current'
                    }`}
                  >
                    {selected && <span className="text-[8px] text-white font-black">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{inv.full_name}</p>
                    <p className="text-[10px] opacity-50">
                      {ROLE_LABELS[inv.role] ?? inv.role}
                      {inv.job_title ? ` · ${inv.job_title}` : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* أزرار التقديم */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push('/meetings')}
          className="glass-panel px-6 py-3 rounded-2xl text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-xl shadow-sky-500/20 transition-all flex items-center gap-2"
        >
          {isPending ? 'جارٍ الحفظ...' : 'إنشاء الاجتماع'}
          {!isPending && <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
