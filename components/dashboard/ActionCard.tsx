import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toneChipClass, type DashboardTone } from './tones';

/**
 * ActionCard — بطاقة إجراء/تنقّل موحّدة (تستبدل بطاقات surface-block/glass-card المتكرّرة).
 *
 * رقاقة أيقونة + عنوان + وصف + سهم «دخول» (ArrowLeft للـ RTL). تدعم: رابط (href) أو زر (onClick)
 * أو حالة «قريباً» (comingSoon) المعطّلة بصدق (لا رابط وهمي). تُستخدم لشبكات التنقّل في لوحات الأدوار.
 */

interface ActionCardProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    tone?: DashboardTone;
    href?: string;
    onClick?: () => void;
    /** عنصر مخطّط بلا مسار حقيقي بعد → معطّل مع شارة «قريباً». */
    comingSoon?: boolean;
    className?: string;
}

const BASE =
    'group flex h-full w-full items-start gap-4 rounded-2xl border border-border bg-card p-5 text-right shadow-sm transition-colors';
const INTERACTIVE = 'hover:border-primary/40 hover:bg-primary/5';

function Body({ title, description, icon: Icon, tone = 'primary', comingSoon }: ActionCardProps) {
    return (
        <>
            {Icon && (
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneChipClass[tone]}`}>
                    <Icon className="h-5 w-5" />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-foreground">{title}</span>
                    {comingSoon ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">قريباً</span>
                    ) : (
                        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    )}
                </span>
                {description && (
                    <span className="mt-1.5 block text-sm leading-6 text-muted-foreground">{description}</span>
                )}
            </span>
        </>
    );
}

export function ActionCard(props: ActionCardProps) {
    const { href, onClick, comingSoon, className = '' } = props;

    if (comingSoon || (!href && !onClick)) {
        return (
            <div className={`${BASE} cursor-not-allowed opacity-70 ${className}`} dir="rtl">
                <Body {...props} comingSoon />
            </div>
        );
    }

    if (href) {
        return (
            <Link href={href} className={`${BASE} ${INTERACTIVE} ${className}`} dir="rtl">
                <Body {...props} />
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className={`${BASE} ${INTERACTIVE} ${className}`} dir="rtl">
            <Body {...props} />
        </button>
    );
}
