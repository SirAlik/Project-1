import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * DashboardSection — حاوية قسم معنونة موحّدة (بطاقة فاتحة معتمدة) لجسم لوحات الأدوار.
 *
 * تستبدل أنماط البطاقات المتكرّرة (glass-card / glass-panel / surface-block / rounded-[2.5rem]).
 * ترويسة بأيقونة primary + عنوان + فتحة إجراء اختيارية، ثم المحتوى.
 */

interface DashboardSectionProps {
    title: ReactNode;
    icon?: LucideIcon;
    /** إجراء على يسار الترويسة (رابط/زر «عرض الكل» مثلاً). */
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function DashboardSection({ title, icon: Icon, action, children, className = '' }: DashboardSectionProps) {
    return (
        <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 ${className}`} dir="rtl">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-black text-foreground">
                    {Icon && <Icon className="h-4 w-4 text-primary" />}
                    {title}
                </h2>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </section>
    );
}
