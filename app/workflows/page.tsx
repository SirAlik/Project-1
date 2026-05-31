import { Suspense }      from 'react';
import Link              from 'next/link';
import type { Metadata } from 'next';
import { ClipboardCheck, Clock, ChevronLeft, Inbox } from 'lucide-react';

import { getMyPendingGates, type PendingGateSummary } from '@/lib/workflow-service';
import { workflowName, roleLabel }                    from '@/lib/workflow-labels';
import { WorkflowStatusBadge }                        from '@/components/workflow/WorkflowStatusBadge';

export const metadata: Metadata = { title: 'بانتظار موافقتك' };

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function formatDateAr(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function urgencyClass(dueDateIso: string | null): string {
  if (!dueDateIso) return '';
  const diff = new Date(dueDateIso).getTime() - Date.now();
  if (diff < 0)                     return 'text-red-600';
  if (diff < 48 * 60 * 60 * 1000)  return 'text-yellow-600';
  return 'text-muted-foreground';
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function GateCard({ gate }: { gate: PendingGateSummary }) {
  return (
    <Link
      href={`/workflows/${gate.workflow_instance_id}`}
      className="
        group flex items-start gap-4 p-5 rounded-2xl
        border border-border/60 bg-card
        hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5
        active:scale-[0.99] transition-all duration-200
      "
    >
      {/* أيقونة */}
      <div className="
        flex-shrink-0 w-11 h-11 rounded-2xl
        flex items-center justify-center
        bg-primary/10 text-primary
        group-hover:bg-primary group-hover:text-primary-foreground
        transition-colors
      ">
        <ClipboardCheck className="w-5 h-5" />
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
            {gate.gate_name}
          </span>
          <WorkflowStatusBadge status="pending" />
        </div>

        <p className="text-xs text-muted-foreground">
          {workflowName(gate.workflow_code)}
          {' · '}
          <span className="font-medium">{roleLabel(gate.required_role)}</span>
        </p>

        {gate.due_date && (
          <div className={`flex items-center gap-1 text-xs font-medium ${urgencyClass(gate.due_date)}`}>
            <Clock className="w-3 h-3" />
            الاستحقاق: {formatDateAr(gate.due_date)}
          </div>
        )}

        {!gate.due_date && (
          <p className="text-xs text-muted-foreground/60">
            وارد {formatDateAr(gate.created_at)}
          </p>
        )}
      </div>

      {/* سهم */}
      <ChevronLeft className="flex-shrink-0 w-5 h-5 text-muted-foreground/40 group-hover:text-primary mt-3 transition-colors rtl:rotate-180" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
        <Inbox className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-foreground">لا توجد إجراءات معلقة</p>
        <p className="text-sm text-muted-foreground">كل شيء محدّث — لا يوجد ما يستدعي موافقتك الآن.</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
      تعذّر تحميل الإجراءات المعلقة: {message}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

async function GatesList() {
  const result = await getMyPendingGates();

  if (!result.ok) return <ErrorState message={result.error} />;

  const gates = result.data;
  if (gates.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {gates.map(gate => (
        <GateCard key={gate.gate_id} gate={gate} />
      ))}
    </div>
  );
}

function GatesListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-2xl border border-border/40 bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}

export default function WorkflowsInboxPage() {
  return (
    <main className="min-h-screen bg-background font-saudi" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* رأس الصفحة */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            بانتظار موافقتك
          </h1>
          <p className="text-sm text-muted-foreground">
            الإجراءات التي تتطلب قرارك أو مراجعتك
          </p>
        </div>

        {/* القائمة */}
        <Suspense fallback={<GatesListSkeleton />}>
          <GatesList />
        </Suspense>

      </div>
    </main>
  );
}
