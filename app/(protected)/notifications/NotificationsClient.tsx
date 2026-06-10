'use client';

import { useState, useTransition } from 'react';
import Link                        from 'next/link';
import {
  Bell, CheckCheck, ExternalLink,
  ClipboardCheck, Calendar, Users, Upload,
  FileText, AlertCircle,
} from 'lucide-react';
import { markAsReadAction, markAllAsReadAction } from './_actions';
import type { NotificationItem } from '@/lib/services/notification-service';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function typeIcon(type: string) {
  if (type.includes('gate') || type.includes('workflow')) return <ClipboardCheck className="w-4 h-4" />;
  if (type.includes('meeting'))  return <Calendar className="w-4 h-4" />;
  if (type.includes('hr'))       return <Users className="w-4 h-4" />;
  if (type.includes('upload') || type.includes('bulk')) return <Upload className="w-4 h-4" />;
  if (type.includes('form'))     return <FileText className="w-4 h-4" />;
  return <AlertCircle className="w-4 h-4" />;
}

function sourcePath(n: NotificationItem): string | null {
  if (n.workflow_instance_id) return `/workflows/${n.workflow_instance_id}`;
  if (n.source_table === 'meeting_sessions' && n.source_record_id)
    return `/meetings/${n.source_record_id}`;
  if (n.source_table === 'bulk_upload_jobs') return '/bulk-upload';
  if (n.source_table === 'hr_accountability_tickets') return '/secretary/staff-attendance';
  return null;
}

function groupByDate(items: NotificationItem[]) {
  const today    = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: { label: string; items: NotificationItem[] }[] = [
    { label: 'اليوم',    items: [] },
    { label: 'أمس',      items: [] },
    { label: 'سابقاً',   items: [] },
  ];
  for (const n of items) {
    const d = new Date(n.created_at).toDateString();
    if (d === today)     groups[0].items.push(n);
    else if (d === yesterday) groups[1].items.push(n);
    else                 groups[2].items.push(n);
  }
  return groups.filter(g => g.items.length > 0);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1)   return 'الآن';
  if (mins < 60)  return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationRow
// ─────────────────────────────────────────────────────────────────────────────

function NotificationRow({
  n,
  onMarkRead,
}: {
  n: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const href = sourcePath(n);

  const inner = (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-2xl border transition-all
        ${n.is_read
          ? 'border-border/40 bg-card/50 opacity-70'
          : 'border-primary/20 bg-primary/5 shadow-sm'}
      `}
    >
      {/* أيقونة النوع */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
        ${n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}
      `}>
        {typeIcon(n.notification_type)}
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold leading-snug ${n.is_read ? 'text-foreground/70' : 'text-foreground'}`}>
            {n.title}
          </p>
          {!n.is_read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
          )}
        </div>
        {n.body && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {n.body}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-[11px] text-muted-foreground/60">
            {timeAgo(n.created_at)}
          </span>
          <div className="flex items-center gap-2">
            {href && (
              <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                فتح <ExternalLink className="w-3 h-3" />
              </span>
            )}
            {!n.is_read && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(n.id); }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                تحديد كمقروء
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────────────────────────

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isPending, startTransition]      = useTransition();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  function handleMarkRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    startTransition(async () => { await markAsReadAction(id); });
  }

  function handleMarkAll() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    startTransition(async () => { await markAllAsReadAction(); });
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
          <Bell className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <div>
          <p className="font-bold text-foreground">لا توجد إشعارات</p>
          <p className="text-sm text-muted-foreground mt-1">
            ستظهر هنا الإشعارات من الـ Workflows والاجتماعات وغيرها
          </p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6">
      {/* شريط الإجراءات */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {unreadCount} غير مقروء
          </span>
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-primary hover:opacity-80 transition-opacity font-medium disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
          </button>
        </div>
      )}

      {/* الإشعارات مجمّعة حسب التاريخ */}
      {groups.map(group => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest px-1">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.items.map(n => (
              <NotificationRow key={n.id} n={n} onMarkRead={handleMarkRead} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
