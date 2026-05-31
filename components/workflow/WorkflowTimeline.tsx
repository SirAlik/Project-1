import { Bot, User } from 'lucide-react';
import { stateLabel, actionLabel, roleLabel } from '@/lib/workflow-labels';
import type { WorkflowTransition } from '@/lib/types/workflow';

interface Props {
  transitions: WorkflowTransition[];
}

function formatDateAr(iso: string): string {
  return new Date(iso).toLocaleString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function WorkflowTimeline({ transitions }: Props) {
  if (transitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        لا يوجد سجل انتقالات بعد
      </p>
    );
  }

  return (
    <ol className="relative" dir="rtl">
      {/* خط رأسي */}
      <div className="absolute top-0 bottom-0 end-[18px] w-px bg-border/60" />

      <div className="space-y-6">
        {transitions.map((t, idx) => {
          const isStart  = !t.from_state;
          const isSystem = t.is_system_action;
          const isLast   = idx === transitions.length - 1;

          return (
            <li key={t.id} className="flex gap-4 items-start relative">
              {/* أيقونة الدائرة */}
              <div className={`
                relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                border-2 shadow-sm
                ${isSystem
                  ? 'bg-muted border-border text-muted-foreground'
                  : isLast
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-primary/40 text-primary'}
              `}>
                {isSystem
                  ? <Bot className="w-4 h-4" />
                  : <User className="w-4 h-4" />
                }
              </div>

              {/* المحتوى */}
              <div className="flex-1 min-w-0 pb-2">
                {/* السطر الأول: الإجراء + الانتقال */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-0.5">
                  <span className={`font-bold text-sm ${isLast ? 'text-primary' : 'text-foreground'}`}>
                    {actionLabel(t.action)}
                  </span>

                  {!isStart && (
                    <span className="text-xs text-muted-foreground">
                      {stateLabel(t.from_state)}
                      {' → '}
                      <span className="font-medium text-foreground/80">{stateLabel(t.to_state)}</span>
                    </span>
                  )}

                  {isStart && (
                    <span className="text-xs text-muted-foreground">
                      الحالة الأولى: <span className="font-medium text-foreground/80">{stateLabel(t.to_state)}</span>
                    </span>
                  )}
                </div>

                {/* الممثل */}
                {!isSystem && t.actor_name_snapshot && (
                  <p className="text-xs text-muted-foreground">
                    {t.actor_name_snapshot}
                    {t.actor_role_snapshot && ` · ${roleLabel(t.actor_role_snapshot)}`}
                  </p>
                )}

                {isSystem && (
                  <p className="text-xs text-muted-foreground">النظام (تلقائي)</p>
                )}

                {/* ملاحظات القرار */}
                {t.decision_notes && (
                  <p className="mt-1.5 text-xs text-foreground/75 bg-muted/60 rounded-lg px-2.5 py-1.5 leading-relaxed">
                    {t.decision_notes}
                  </p>
                )}

                {/* التوقيت */}
                <p className="text-[11px] text-muted-foreground/50 mt-1">
                  {formatDateAr(t.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </div>
    </ol>
  );
}
