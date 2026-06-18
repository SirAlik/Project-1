import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { toneChipClass, type DashboardTone } from './tones';

/**
 * MetricCard — بطاقة مؤشّر موحّدة (تستبدل KPICard القديمة surface-block/text-text-*).
 *
 * رقاقة أيقونة بالنغمة + قيمة كبيرة (tabular-nums) + تسمية. اختيارياً رابط (Link) أو تلميح.
 * **قاعدة صدق البيانات:** لا تُمرَّر قيم وهمية هنا — المؤشّر الذي لا مصدر حقيقي له يُعرض كحالة فارغة
 * صادقة (EmptyState) لا كرقم مُختلَق.
 */

interface MetricCardProps {
    label: string;
    /** القيمة المعروضة (سلسلة منسّقة أو رقم). */
    value: string | number;
    icon?: LucideIcon;
    tone?: DashboardTone;
    /** نصّ تلميح صغير تحت التسمية. */
    hint?: string;
    /** عند تمريره تصبح البطاقة رابطاً. */
    href?: string;
    className?: string;
}

export function MetricCard({ label, value, icon: Icon, tone = 'primary', hint, href, className = '' }: MetricCardProps) {
    const card = (
        <div
            className={`h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${className}`}
        >
            {Icon && (
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneChipClass[tone]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <p className="text-3xl font-black tabular-nums text-foreground">{value}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
            {hint && <p className="mt-0.5 text-[11px] font-medium text-muted-foreground/80">{hint}</p>}
        </div>
    );

    return href ? (
        <Link href={href} className="block">
            {card}
        </Link>
    ) : (
        card
    );
}
