'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle, AlertCircle, UserCheck, Clock } from 'lucide-react';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { roleLabel } from '@/lib/workflow-labels';
import { decideGateAction } from '@/app/workflows/_actions';
import { useRouter } from 'next/navigation';
import type { ApprovalGate } from '@/lib/types/workflow';

interface Props {
  gate: ApprovalGate;
  canDecide: boolean;
}

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function isDueSoon(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false;
  const diff = new Date(dueDateIso).getTime() - Date.now();
  return diff > 0 && diff < 48 * 60 * 60 * 1000; // أقل من 48 ساعة
}

function isOverdue(dueDateIso: string | null): boolean {
  if (!dueDateIso) return false;
  return new Date(dueDateIso).getTime() < Date.now();
}

export function ApprovalGateCard({ gate, canDecide }: Props) {
  const [justification, setJustification]   = useState('');
  const [error, setError]                   = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();
  const router                              = useRouter();

  const handleDecision = (decision: 'approved' | 'rejected') => {
    setError(null);
    startTransition(async () => {
      const result = await decideGateAction(
        gate.id,
        decision,
        justification.trim() || undefined,
      );
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const overdue  = isOverdue(gate.due_date);
  const dueSoon  = isDueSoon(gate.due_date);
  const isPendingGate = gate.status === 'pending';

  return (
    <div className={`
      rounded-2xl border p-4 space-y-3 transition-colors
      ${isPendingGate && canDecide
        ? 'border-primary/40 bg-primary/5'
        : 'border-border bg-card'}
    `}>
      {/* الرأس */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <h4 className="font-bold text-sm text-foreground truncate">{gate.gate_name}</h4>
        </div>
        <WorkflowStatusBadge status={gate.status} />
      </div>

      {/* الدور المطلوب */}
      <p className="text-xs text-muted-foreground">
        الدور المطلوب:{' '}
        <span className="font-medium text-foreground/80">{roleLabel(gate.required_role)}</span>
      </p>

      {/* تاريخ الاستحقاق */}
      {gate.due_date && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          overdue ? 'text-red-600' : dueSoon ? 'text-yellow-600' : 'text-muted-foreground'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {overdue ? 'متأخر — ' : dueSoon ? 'قريباً — ' : ''}
          الاستحقاق: {formatDateAr(gate.due_date)}
        </div>
      )}

      {/* صاحب القرار */}
      {gate.decided_by_name_snapshot && (
        <p className="text-xs text-muted-foreground">
          القرار بواسطة:{' '}
          <span className="font-medium text-foreground/80">{gate.decided_by_name_snapshot}</span>
          {gate.decided_at && ` · ${formatDateAr(gate.decided_at)}`}
        </p>
      )}

      {/* مبرر القرار */}
      {gate.justification && (
        <p className="text-xs text-foreground/75 bg-muted/60 rounded-lg px-3 py-2 leading-relaxed">
          المبرر: {gate.justification}
        </p>
      )}

      {/* نموذج القرار — يظهر فقط عند pending + canDecide */}
      {isPendingGate && canDecide && (
        <div className="space-y-2.5 pt-3 border-t border-border/60">
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="ملاحظات أو مبرر القرار (اختياري)"
            rows={2}
            disabled={isPending}
            className="
              w-full text-sm rounded-xl border border-border bg-background
              px-3 py-2 resize-none font-saudi text-foreground
              placeholder:text-muted-foreground/60
              focus:outline-none focus:ring-2 focus:ring-primary/40
              disabled:opacity-50
            "
          />

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDecision('approved')}
              disabled={isPending}
              className="
                flex items-center justify-center gap-2
                py-2.5 rounded-xl text-sm font-bold
                bg-green-500/10 text-green-700 border border-green-300
                hover:bg-green-500/20 active:scale-[0.98]
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <CheckCircle2 className="w-4 h-4" />
              موافقة
            </button>

            <button
              onClick={() => handleDecision('rejected')}
              disabled={isPending}
              className="
                flex items-center justify-center gap-2
                py-2.5 rounded-xl text-sm font-bold
                bg-red-500/10 text-red-600 border border-red-300
                hover:bg-red-500/20 active:scale-[0.98]
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <XCircle className="w-4 h-4" />
              رفض
            </button>
          </div>
        </div>
      )}

      {/* gate معلق لكن المستخدم ليس صاحب القرار */}
      {isPendingGate && !canDecide && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          بانتظار موافقة {roleLabel(gate.required_role)}
        </p>
      )}
    </div>
  );
}
