import { Suspense }      from 'react';
import Link              from 'next/link';
import type { Metadata } from 'next';
import { FileText, Clock, CheckCircle2, XCircle, Archive, AlertCircle, ChevronLeft } from 'lucide-react';

import { getHRTickets, type HRTicketRow } from '@/lib/services/hr-attendance-service';
import { HRTicketActions }                from './HRTicketActions';

export const metadata: Metadata = { title: 'تذاكر المساءلة' };

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

const VIOLATION_LABELS: Record<string, string> = {
  late:            'تأخر',
  absence:         'غياب',
  early_departure: 'مغادرة مبكرة',
  other:           'أخرى',
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open:               { label: 'مفتوحة',             icon: FileText,     color: 'text-blue-600 bg-blue-500/10 border-blue-200' },
  awaiting_response:  { label: 'بانتظار الرد',         icon: Clock,        color: 'text-yellow-600 bg-yellow-500/10 border-yellow-200' },
  awaiting_decision:  { label: 'بانتظار القرار',        icon: AlertCircle,  color: 'text-orange-600 bg-orange-500/10 border-orange-200' },
  decided:            { label: 'صدر القرار',            icon: CheckCircle2, color: 'text-green-600 bg-green-500/10 border-green-200' },
  archived:           { label: 'مؤرشفة',              icon: Archive,      color: 'text-muted-foreground bg-muted/40 border-border' },
  cancelled:          { label: 'ملغاة',               icon: XCircle,      color: 'text-destructive bg-destructive/10 border-destructive/20' },
};

// ────────────────────────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: HRTicketRow }) {
  const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${cfg.color}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-4 h-4 flex-shrink-0" />
            <p className="font-bold text-sm truncate">{ticket.employee_name_snapshot}</p>
          </div>
          <p className="text-xs opacity-70">{ticket.employee_role_snapshot}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-mono opacity-60">{ticket.ticket_number}</p>
          <p className="text-xs font-bold mt-0.5">{cfg.label}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="font-bold">
          {VIOLATION_LABELS[ticket.violation_type] ?? ticket.violation_type}
        </span>
        <span className="opacity-60">·</span>
        <span className="opacity-70">{formatDateAr(ticket.violation_date)}</span>
      </div>

      {ticket.violation_details && (
        <p className="text-xs opacity-70 bg-stone-200/70 rounded-lg px-2.5 py-1.5 leading-relaxed">
          {ticket.violation_details}
        </p>
      )}

      {ticket.employee_response && (
        <div className="text-xs bg-stone-200/70 rounded-lg px-2.5 py-1.5 space-y-0.5">
          <p className="font-bold opacity-70">رد الموظف:</p>
          <p className="leading-relaxed">{ticket.employee_response}</p>
        </div>
      )}

      {ticket.principal_decision && (
        <p className="text-xs font-bold">
          قرار المدير:{' '}
          <span className="font-normal opacity-80">{ticket.principal_decision}</span>
        </p>
      )}

      {/* زر إطلاق workflow للتذاكر المفتوحة فقط */}
      {ticket.status === 'open' && !ticket.workflow_instance_id && (
        <HRTicketActions ticketId={ticket.id} />
      )}

      {/* رابط لـ workflow detail */}
      {ticket.workflow_instance_id && (
        <Link
          href={`/workflows/${ticket.workflow_instance_id}`}
          className="inline-flex items-center gap-1 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
          عرض مسار الموافقة
        </Link>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
        <FileText className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-foreground">لا توجد تذاكر</p>
        <p className="text-sm text-muted-foreground">لم يُنشأ أي تذاكر مساءلة بعد.</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Data component
// ────────────────────────────────────────────────────────────

async function TicketsList() {
  const result = await getHRTickets();

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        تعذّر تحميل التذاكر: {result.error}
      </div>
    );
  }

  const tickets = result.data;
  if (tickets.length === 0) return <EmptyState />;

  // تجميع حسب الحالة
  const grouped: Record<string, HRTicketRow[]> = {};
  for (const t of tickets) {
    if (!grouped[t.status]) grouped[t.status] = [];
    grouped[t.status].push(t);
  }

  const ORDER = ['open', 'awaiting_response', 'awaiting_decision', 'decided', 'archived', 'cancelled'];

  return (
    <div className="space-y-6">
      {ORDER.filter(s => grouped[s]?.length).map(status => (
        <section key={status} className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">
            {STATUS_CONFIG[status]?.label ?? status} ({grouped[status].length})
          </h2>
          <div className="space-y-3">
            {grouped[status].map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TicketsListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-28 rounded-2xl border border-border/40 bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function HRTicketsPage() {
  return (
    <main className="min-h-screen bg-background font-saudi" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            تذاكر المساءلة
          </h1>
          <p className="text-sm text-muted-foreground">
            إدارة تذاكر مساءلة الحضور وإطلاق مسارات المراجعة
          </p>
        </div>

        <Suspense fallback={<TicketsListSkeleton />}>
          <TicketsList />
        </Suspense>

      </div>
    </main>
  );
}
