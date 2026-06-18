import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * PageHeader — ترويسة موحّدة لجسم لوحات الأدوار (داخل RoleDashboardShell / SchoolDashboardShell).
 *
 * بطاقة فاتحة معتمدة (rounded-2xl border border-border bg-card shadow-sm) تحمل: رقاقة أيقونة اختيارية،
 * سطر علوي (kicker) اختياري، عنوان، عنوان فرعي، وفتحة إجراءات (actions) على اليسار. النصّ المهم
 * charcoal (text-foreground) والثانوي text-muted-foreground. لا تكرّر اسم المدرسة/الدور — يأتيان من الصدفة.
 */

interface PageHeaderProps {
    /** أيقونة الدور/الصفحة (تظهر في رقاقة primary). */
    icon?: LucideIcon;
    /** سطر علوي صغير (uppercase eyebrow). */
    kicker?: string;
    /** العنوان الرئيسي (نصّ أو عناصر مع تمييز ملوّن). */
    title: ReactNode;
    /** العنوان الفرعي. */
    subtitle?: ReactNode;
    /** إجراءات الترويسة (أزرار/روابط). */
    actions?: ReactNode;
    /** عنصر إحصائي زائل في الطرف (مثل نسبة الجاهزية). */
    trailing?: ReactNode;
    /** توسيط المحتوى (نمط hero للصفحات البسيطة). */
    align?: 'start' | 'center';
    className?: string;
}

export function PageHeader({
    icon: Icon,
    kicker,
    title,
    subtitle,
    actions,
    trailing,
    align = 'start',
    className = '',
}: PageHeaderProps) {
    const centered = align === 'center';

    return (
        <header
            className={`rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7 ${className}`}
            dir="rtl"
        >
            <div
                className={
                    centered
                        ? 'flex flex-col items-center gap-3 text-center'
                        : 'flex flex-wrap items-start justify-between gap-4'
                }
            >
                <div className={centered ? 'flex flex-col items-center gap-3' : 'flex min-w-0 items-start gap-4'}>
                    {Icon && (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-6 w-6" />
                        </span>
                    )}
                    <div className="min-w-0">
                        {kicker && (
                            <p className="mb-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                {kicker}
                            </p>
                        )}
                        <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
                        {subtitle && (
                            <p className={`mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                {trailing && !actions && <div className="shrink-0">{trailing}</div>}
            </div>
        </header>
    );
}
