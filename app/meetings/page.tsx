import { Suspense }       from 'react';
import Link               from 'next/link';
import type { Metadata }  from 'next';
import { redirect }       from 'next/navigation';
import {
  CalendarDays, Plus, Clock, MapPin,
  ChevronLeft, Inbox,
} from 'lucide-react';
import { getActivePersona }     from '@/lib/auth/context-service';
import { getMyMeetings }         from '@/lib/services/meeting-service';
import { stateLabel }            from '@/lib/workflow-labels';
import type { MeetingListItem }  from '@/lib/services/meeting-service';

export const metadata: Metadata = { title: 'الاجتماعات' };

// ─────────────────────────────────────────────────────────────
const MEETING_TYPE_LABELS: Record<string, string> = {
  regular:           'اجتماع دوري',
  emergency:         'اجتماع طارئ',
  specialized:       'اجتماع متخصص',
  management_review: 'مراجعة الإدارة',
  other:             'أخرى',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled:           'text-sky-400 bg-sky-400/10',
  in_progress:         'text-emerald-400 bg-emerald-400/10',
  ended:               'text-amber-400 bg-amber-400/10',
  awaiting_signatures: 'text-violet-400 bg-violet-400/10',
  minutes_signed:      'text-emerald-400 bg-emerald-400/10',
  cancelled:           'text-red-400 bg-red-400/10',
};

const CAN_CREATE = [
  'school_principal', 'school_admin', 'school_secretary',
  'quality_coordinator', 'system_owner',
];

// ─────────────────────────────────────────────────────────────
function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const statusCls = STATUS_COLORS[meeting.status] ?? 'text-muted-foreground bg-muted/20';

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group flex items-start gap-4 p-5 rounded-2xl border border-border/60 bg-card hover:border-sky-500/40 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
    >
      {/* أيقونة */}
      <div className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
        <CalendarDays className="w-5 h-5" />
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-sm truncate group-hover:text-sky-500 transition-colors">
            {meeting.title}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${statusCls}`}>
            {stateLabel(meeting.status)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {new Date(meeting.scheduled_date).toLocaleDateString('ar-SA', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meeting.start_time}
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {meeting.location}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>{MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}</span>
          <span>المنظِّم: {meeting.organizer_name_snapshot}</span>
        </div>
      </div>

      <ChevronLeft className="flex-shrink-0 w-5 h-5 text-muted-foreground/40 group-hover:text-sky-500 mt-3 transition-colors rtl:rotate-180" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
async function MeetingsList() {
  const result = await getMyMeetings();

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        تعذّر تحميل الاجتماعات: {result.error}
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
          <Inbox className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-foreground">لا توجد اجتماعات بعد</p>
          <p className="text-sm text-muted-foreground">أنشئ أول اجتماع لبدء تتبع المحاضر والقرارات.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {result.data.map((m) => (
        <MeetingCard key={m.id} meeting={m} />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl border border-border/40 bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default async function MeetingsPage() {
  const persona = await getActivePersona();
  if (!persona) redirect('/login');

  const canCreate = CAN_CREATE.includes(persona.role) || persona.isSystemOwner;

  return (
    <main className="min-h-screen bg-background font-saudi" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-sky-500" />
              الاجتماعات
            </h1>
            <p className="text-sm text-muted-foreground">
              محاضر الاجتماعات والقرارات وبنود الإجراء
            </p>
          </div>

          {canCreate && (
            <Link
              href="/meetings/new"
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl shadow-sky-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              اجتماع جديد
            </Link>
          )}
        </div>

        <Suspense fallback={<Skeleton />}>
          <MeetingsList />
        </Suspense>
      </div>
    </main>
  );
}
