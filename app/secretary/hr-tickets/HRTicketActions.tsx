'use client';

import { useState, useTransition } from 'react';
import { useRouter }                from 'next/navigation';
import { Play, AlertTriangle }      from 'lucide-react';
import { startHRWorkflowAction }    from './_actions';

interface Props {
  ticketId: string;
}

export function HRTicketActions({ ticketId }: Props) {
  const [error,     setError]   = useState<string | null>(null);
  const [isPending, startTrans] = useTransition();
  const router = useRouter();

  const handleStart = () => {
    setError(null);
    startTrans(async () => {
      const result = await startHRWorkflowAction(ticketId);
      if (result.ok) {
        router.push(`/workflows/${result.data.instance_id}`);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-1.5 pt-1">
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
      <button
        onClick={handleStart}
        disabled={isPending}
        className="
          flex items-center gap-2 text-xs font-bold
          px-3 py-1.5 rounded-lg
          bg-primary/10 text-primary border border-primary/20
          hover:bg-primary/20 active:scale-[0.98]
          transition-all disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <Play className="w-3.5 h-3.5" />
        {isPending ? 'جارٍ الإطلاق...' : 'إطلاق مسار المساءلة'}
      </button>
    </div>
  );
}
