import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * EmptyState — حالة فارغة/غير-مفعّلة صادقة موحّدة (قاعدة صدق البيانات).
 *
 * تُعرض بدل رقم/تحليل/مؤشّر مُختلَق عندما لا يوجد مصدر بيانات حقيقي. بطاقة منقّطة فاتحة:
 * أيقونة محايدة + عنوان + تلميح + فتحة إجراء اختيارية.
 */

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    hint?: ReactNode;
    /** إجراء اختياري (زر/رابط CTA). */
    action?: ReactNode;
    tone?: 'neutral' | 'ok';
    className?: string;
}

export function EmptyState({ icon: Icon, title, hint, action, tone = 'neutral', className = '' }: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-10 text-center ${className}`}
            dir="rtl"
        >
            {Icon && (
                <span
                    className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${tone === 'ok' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                >
                    <Icon className="h-6 w-6" />
                </span>
            )}
            <p className="text-sm font-black text-foreground">{title}</p>
            {hint && <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
