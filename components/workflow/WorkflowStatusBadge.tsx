import type { WorkflowStatus, ApprovalGateStatus } from '@/lib/types/workflow';

type AnyStatus = WorkflowStatus | ApprovalGateStatus | string;

const CONFIG: Record<string, { label: string; className: string }> = {
  // workflow instance
  in_progress:  { label: 'جارٍ',            className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  completed:    { label: 'مكتمل',           className: 'bg-green-500/10 text-green-700 border-green-200' },
  cancelled:    { label: 'ملغى',            className: 'bg-gray-400/10 text-gray-500 border-gray-200' },
  escalated:    { label: 'مُصعَّد',         className: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  // approval gate
  pending:      { label: 'بانتظار القرار',  className: 'bg-yellow-400/15 text-yellow-700 border-yellow-300' },
  approved:     { label: 'موافَق',          className: 'bg-green-500/10 text-green-700 border-green-200' },
  rejected:     { label: 'مرفوض',          className: 'bg-red-500/10 text-red-600 border-red-200' },
  expired:      { label: 'منتهي المهلة',   className: 'bg-gray-400/10 text-gray-500 border-gray-200' },
};

interface Props {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export function WorkflowStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = CONFIG[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };

  const sizeClass = size === 'md'
    ? 'px-3 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${sizeClass} ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
