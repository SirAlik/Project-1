'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { MessageSquare, CheckCircle2, Zap, Paperclip, Send } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/db/supabase-browser';
import { addNoteAction }            from './_actions';
import type { MeetingLiveNote, MeetingNoteType } from '@/lib/types/layer6';

const NOTE_TYPE_CONFIG: Record<MeetingNoteType, { label: string; icon: React.ElementType; color: string }> = {
  discussion:  { label: 'نقاش',        icon: MessageSquare,  color: 'text-sky-400' },
  decision:    { label: 'قرار',         icon: CheckCircle2,   color: 'text-emerald-400' },
  action_item: { label: 'بند إجراء',   icon: Zap,            color: 'text-amber-400' },
  attachment:  { label: 'مرفق',         icon: Paperclip,      color: 'text-violet-400' },
};

interface Props {
  meetingId:    string;
  initialNotes: MeetingLiveNote[];
}

export function LiveNotesPanel({ meetingId, initialNotes }: Props) {
  const [notes, setNotes]          = useState<MeetingLiveNote[]>(initialNotes);
  const [content, setContent]      = useState('');
  const [noteType, setNoteType]    = useState<MeetingNoteType>('discussion');
  const [error, setError]          = useState<string | null>(null);
  const [isPending, startT]        = useTransition();
  const bottomRef                  = useRef<HTMLDivElement>(null);

  // Supabase Realtime — يستقبل الملاحظات الجديدة من جميع المشاركين
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel  = supabase
      .channel(`meeting-notes-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'meeting_live_notes',
          filter: `meeting_session_id=eq.${meetingId}`,
        },
        (payload) => {
          setNotes((prev) => {
            // تجنب التكرار إذا كانت الملاحظة أُضيفت محلياً بالفعل
            if (prev.some((n) => n.id === payload.new.id)) return prev;
            return [...prev, payload.new as MeetingLiveNote];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId]);

  // التمرير للأسفل عند وصول ملاحظات جديدة
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);

    const draft: MeetingLiveNote = {
      id:                   `optimistic-${Date.now()}`,
      meeting_session_id:   meetingId,
      school_id:            '',
      author_persona_id:    '',
      author_name_snapshot: 'أنت',
      note_type:            noteType,
      content:              content.trim(),
      agenda_topic_idx:     null,
      created_at:           new Date().toISOString(),
    };

    // optimistic update
    setNotes((prev) => [...prev, draft]);
    const savedContent = content.trim();
    setContent('');

    startT(async () => {
      const result = await addNoteAction(meetingId, {
        note_type: noteType,
        content:   savedContent,
      });

      if (!result.ok) {
        setError(result.error);
        // إزالة الملاحظة المتفائلة عند الفشل
        setNotes((prev) => prev.filter((n) => n.id !== draft.id));
        setContent(savedContent);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* قائمة الملاحظات */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-sm font-black">سجل الاجتماع الحي</h3>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            مباشر
          </span>
        </div>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 space-y-3">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-20">
              <MessageSquare className="w-10 h-10 mb-2" />
              <p className="text-xs font-bold">لا توجد ملاحظات بعد — ابدأ التدوين</p>
            </div>
          ) : (
            notes.map((note) => {
              const cfg = NOTE_TYPE_CONFIG[note.note_type] ?? NOTE_TYPE_CONFIG.discussion;
              const Icon = cfg.icon;
              return (
                <div
                  key={note.id}
                  className={`flex gap-3 p-3 rounded-xl glass-panel ${
                    note.id.startsWith('optimistic') ? 'opacity-60' : ''
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm leading-relaxed">{note.content}</p>
                    <div className="flex items-center gap-2 text-[10px] opacity-40">
                      <span className={`font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span>·</span>
                      <span>{note.author_name_snapshot}</span>
                      <span>·</span>
                      <span>{new Date(note.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* نموذج إضافة ملاحظة */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4 space-y-3">
        {error && (
          <p className="text-xs text-red-400 font-bold">{error}</p>
        )}

        {/* اختيار النوع */}
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(NOTE_TYPE_CONFIG) as [MeetingNoteType, typeof NOTE_TYPE_CONFIG[MeetingNoteType]][]).map(
            ([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNoteType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    noteType === key
                      ? `bg-white/10 ${cfg.color}`
                      : 'opacity-30 hover:opacity-60'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            },
          )}
        </div>

        {/* حقل الإدخال */}
        <div className="flex gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as never);
              }
            }}
            placeholder="اكتب ملاحظة، قراراً، أو بند إجراء..."
            rows={2}
            className="flex-1 glass-panel rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="self-end bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg shadow-sky-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] opacity-30">Enter للإرسال · Shift+Enter لسطر جديد</p>
      </form>
    </div>
  );
}
