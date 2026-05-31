import { redirect, notFound } from 'next/navigation';
import Link                    from 'next/link';
import { ChevronRight, CalendarDays, MapPin, Clock, Users, CheckCircle2, Zap } from 'lucide-react';
import { getActivePersona }    from '@/lib/auth/context-service';
import { getMeetingById }      from '@/lib/services/meeting-service';
import { stateLabel, ROLE_LABELS } from '@/lib/workflow-labels';
import { LiveNotesPanel }      from './LiveNotesPanel';
import { StartMeetingButton, EndMeetingForm, SignMinutesButton } from './MeetingControls';
import type { MeetingLiveNote, MeetingSessionAttendee, MeetingActionItem } from '@/lib/types/layer6';

const MEETING_TYPE_LABELS: Record<string, string> = {
  regular:           'اجتماع دوري',
  emergency:         'اجتماع طارئ',
  specialized:       'اجتماع متخصص',
  management_review: 'مراجعة الإدارة',
  other:             'أخرى',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:          'text-sky-400 bg-sky-400/10',
  in_progress:        'text-emerald-400 bg-emerald-400/10',
  ended:              'text-amber-400 bg-amber-400/10',
  awaiting_signatures:'text-violet-400 bg-violet-400/10',
  minutes_signed:     'text-emerald-400 bg-emerald-400/10',
  cancelled:          'text-red-400 bg-red-400/10',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-sky-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const persona = await getActivePersona();
  if (!persona) redirect('/login');

  const result = await getMeetingById(id);
  if (!result.ok) notFound();

  const { meeting: m, attendees, notes, actionItems } = result.data;

  const meeting    = m as Record<string, unknown>;
  const status     = meeting.status as string;
  const statusCls  = STATUS_COLORS[status] ?? 'text-muted-foreground bg-muted/20';

  const typedAttendees   = attendees   as unknown as MeetingSessionAttendee[];
  const typedNotes       = notes       as unknown as MeetingLiveNote[];
  const typedActionItems = actionItems as unknown as MeetingActionItem[];

  const agendaItems = (meeting.agenda_items as Array<{ idx: number; text: string }>) ?? [];
  const decisions   = (meeting.decisions   as Array<{ idx: number; text: string }>) ?? [];
  const recos       = (meeting.recommendations as Array<{ idx: number; text: string }>) ?? [];

  return (
    <main className="min-h-screen font-sans pb-24" dir="rtl">
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-14">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs opacity-40 mb-10">
          <Link href="/meetings" className="hover:opacity-80 transition-opacity">الاجتماعات</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="truncate max-w-[200px]">{meeting.title as string}</span>
        </nav>

        {/* رأس الصفحة */}
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${statusCls}`}>
                  {stateLabel(status)}
                </span>
                <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">
                  {meeting.session_number as string}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{meeting.title as string}</h1>
              <p className="text-sm opacity-50">
                {MEETING_TYPE_LABELS[meeting.meeting_type as string] ?? meeting.meeting_type as string}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-50 glass-panel px-4 py-2 rounded-xl">
              <CalendarDays className="w-4 h-4" />
              <span>{formatDate(meeting.scheduled_date as string)}</span>
            </div>
          </div>
        </header>

        {/* معلومات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="glass-card p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
              <Clock className="w-3 h-3" /> الوقت
            </div>
            <p className="text-sm font-bold">{meeting.start_time as string}</p>
          </div>
          {(meeting.location as string | null) && (
            <div className="glass-card p-4 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
                <MapPin className="w-3 h-3" /> الموقع
              </div>
              <p className="text-sm font-bold truncate">{meeting.location as string}</p>
            </div>
          )}
          <div className="glass-card p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
              <Users className="w-3 h-3" /> المدعوون
            </div>
            <p className="text-sm font-bold">{typedAttendees.length}</p>
          </div>
          <div className="glass-card p-4 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
              <Zap className="w-3 h-3" /> بنود الإجراء
            </div>
            <p className="text-sm font-bold">{typedActionItems.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* المحتوى الرئيسي */}
          <div className="lg:col-span-8 space-y-8">

            {/* جدول الأعمال */}
            {agendaItems.length > 0 && (
              <section className="glass-card p-6 rounded-2xl space-y-4">
                <h2 className="text-sm font-black opacity-60 uppercase tracking-widest">جدول الأعمال</h2>
                <ol className="space-y-2">
                  {agendaItems.map((item) => (
                    <li key={item.idx} className="flex gap-3 text-sm">
                      <span className="shrink-0 w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-black">
                        {item.idx + 1}
                      </span>
                      <span className="pt-0.5">{item.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* الملاحظات الحية — فقط عند الانعقاد */}
            {status === 'in_progress' && (
              <section>
                <LiveNotesPanel meetingId={id} initialNotes={typedNotes} />
              </section>
            )}

            {/* المحضر والقرارات — بعد الانتهاء */}
            {['awaiting_signatures', 'minutes_signed'].includes(status) && (
              <>
                {meeting.minutes && (
                  <section className="glass-card p-6 rounded-2xl space-y-4">
                    <h2 className="text-sm font-black opacity-60 uppercase tracking-widest">محضر الاجتماع</h2>
                    <p className="text-sm leading-relaxed opacity-80">{meeting.minutes as string}</p>
                  </section>
                )}

                {decisions.length > 0 && (
                  <section className="glass-card p-6 rounded-2xl space-y-4">
                    <h2 className="text-sm font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> القرارات
                    </h2>
                    <ol className="space-y-2">
                      {decisions.map((d) => (
                        <li key={d.idx} className="flex gap-3 text-sm">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-[10px] font-black">
                            {d.idx + 1}
                          </span>
                          <span className="pt-0.5">{d.text}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {recos.length > 0 && (
                  <section className="glass-card p-6 rounded-2xl space-y-4">
                    <h2 className="text-sm font-black opacity-60 uppercase tracking-widest">التوصيات</h2>
                    <ol className="space-y-2">
                      {recos.map((r) => (
                        <li key={r.idx} className="flex gap-3 text-sm">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center text-[10px] font-black">
                            {r.idx + 1}
                          </span>
                          <span className="pt-0.5">{r.text}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </>
            )}

            {/* بنود الإجراء */}
            {typedActionItems.length > 0 && (
              <section className="glass-card p-6 rounded-2xl space-y-4">
                <h2 className="text-sm font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> بنود الإجراء
                </h2>
                <div className="space-y-3">
                  {typedActionItems.map((ai) => (
                    <div key={ai.id} className="flex gap-3 p-3 glass-panel rounded-xl">
                      <div className={`w-1 rounded-full shrink-0 self-stretch ${
                        ai.status === 'done' ? 'bg-emerald-400' :
                        ai.status === 'in_progress' ? 'bg-amber-400' : 'bg-sky-400'
                      }`} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className={`text-sm ${ai.status === 'done' ? 'line-through opacity-50' : ''}`}>
                          {ai.task}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] opacity-40">
                          <span>{ai.assigned_to_name_snapshot}</span>
                          {ai.due_date && <><span>·</span><span>استحقاق {ai.due_date}</span></>}
                          <span>·</span>
                          <span className={PRIORITY_COLORS[ai.priority]}>{PRIORITY_LABELS[ai.priority]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* أزرار التحكم */}
            {status === 'scheduled' && (
              <StartMeetingButton meetingId={id} />
            )}
            {status === 'in_progress' && (
              <EndMeetingForm meetingId={id} />
            )}
            {status === 'awaiting_signatures' && (
              <SignMinutesButton meetingId={id} />
            )}
          </div>

          {/* الشريط الجانبي: المدعوون */}
          <aside className="lg:col-span-4">
            <div className="glass-card p-6 rounded-2xl space-y-4 sticky top-6">
              <h2 className="text-sm font-black opacity-60 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" /> المدعوون
              </h2>

              {typedAttendees.length === 0 ? (
                <p className="text-xs opacity-30 text-center py-4">لا مدعوِّين</p>
              ) : (
                <div className="space-y-2">
                  {typedAttendees.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-xl glass-panel">
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 font-black text-xs shrink-0">
                        {att.name_snapshot.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{att.name_snapshot}</p>
                        <p className="text-[10px] opacity-40">
                          {ROLE_LABELS[att.role_snapshot ?? ''] ?? att.role_snapshot}
                        </p>
                      </div>
                      {att.signature_time ? (
                        <span className="text-[9px] font-black text-emerald-400">وقّع</span>
                      ) : (
                        <span className={`text-[9px] font-black ${
                          att.rsvp_status === 'accepted' ? 'text-sky-400' :
                          att.rsvp_status === 'declined' ? 'text-red-400' : 'opacity-20'
                        }`}>
                          {att.rsvp_status === 'accepted' ? 'قبل' :
                           att.rsvp_status === 'declined' ? 'اعتذر' : '—'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
