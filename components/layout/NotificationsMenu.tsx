"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link                 from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { motion, AnimatePresence }        from "framer-motion";
import { getNotificationsAction, markAllAsReadAction } from "@/app/notifications/_actions";
import type { NotificationItem } from "@/lib/services/notification-service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (mins < 1)   return 'الآن';
  if (mins < 60)  return `${mins}د`;
  if (hours < 24) return `${hours}س`;
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

function sourcePath(n: NotificationItem): string | null {
  if (n.workflow_instance_id) return `/workflows/${n.workflow_instance_id}`;
  if (n.source_table === 'meeting_sessions' && n.source_record_id)
    return `/meetings/${n.source_record_id}`;
  if (n.source_table === 'bulk_upload_jobs') return '/admin/bulk-upload';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationsMenu = () => {
    const [isOpen,         setIsOpen]         = useState(false);
    const [notifications,  setNotifications]  = useState<NotificationItem[]>([]);
    const [loaded,         setLoaded]         = useState(false);
    const [isPending,      startTransition]   = useTransition();
    const menuRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // جلب الإشعارات عند الفتح الأول
    useEffect(() => {
        if (!isOpen || loaded) return;
        startTransition(async () => {
            const res = await getNotificationsAction();
            if (res.ok) setNotifications(res.data.slice(0, 10));
            setLoaded(true);
        });
    }, [isOpen, loaded]);

    // إغلاق عند النقر خارجاً
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    function handleMarkAll() {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        startTransition(async () => { await markAllAsReadAction(); });
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* زر الجرس */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-current transition-colors relative"
                aria-label="الإشعارات"
                aria-expanded={isOpen}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border shadow-xl rounded-2xl overflow-hidden z-[100]"
                        dir="rtl"
                    >
                        {/* رأس القائمة */}
                        <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                            <h3 className="font-bold text-sm text-foreground">
                                الإشعارات
                                {unreadCount > 0 && (
                                    <span className="mr-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAll}
                                    disabled={isPending}
                                    className="flex items-center gap-1 text-[11px] text-primary hover:opacity-70 transition-opacity disabled:opacity-40"
                                >
                                    <CheckCheck className="w-3 h-3" />
                                    تحديد الكل
                                </button>
                            )}
                        </div>

                        {/* القائمة */}
                        <div className="max-h-[320px] overflow-y-auto">
                            {isPending && !loaded ? (
                                <div className="p-4 space-y-3">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Bell size={28} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">لا توجد إشعارات</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {notifications.map(n => {
                                        const href = sourcePath(n);
                                        const row = (
                                            <div className={`flex items-start gap-3 p-3.5 hover:bg-muted/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                                                {!n.is_read && (
                                                    <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-primary" />
                                                )}
                                                <div className={`flex-1 min-w-0 ${n.is_read ? 'mr-3' : ''}`}>
                                                    <p className={`text-xs font-bold leading-snug ${n.is_read ? 'text-foreground/70' : 'text-foreground'}`}>
                                                        {n.title}
                                                    </p>
                                                    {n.body && (
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                                            {n.body}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                                    <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.created_at)}</span>
                                                    {href && <ExternalLink className="w-3 h-3 text-muted-foreground/40" />}
                                                </div>
                                            </div>
                                        );
                                        return href ? (
                                            <Link key={n.id} href={href} onClick={() => setIsOpen(false)}>
                                                {row}
                                            </Link>
                                        ) : (
                                            <div key={n.id}>{row}</div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* رابط الكل */}
                        <div className="p-3 border-t border-border/40 bg-muted/20">
                            <Link
                                href="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block text-center text-xs text-primary font-medium hover:opacity-70 transition-opacity"
                            >
                                عرض جميع الإشعارات
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
