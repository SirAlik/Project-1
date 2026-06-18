import type { LucideIcon } from 'lucide-react';

/**
 * SegmentedTabs — مبدّل تبويبات شريطي موحّد (يستبدل أشرطة glass-panel/bg-white المتكرّرة في
 * science · health · secretary · activity · qa). نمط واحد: نشط = primary، خامل = نصّ محايد.
 *
 * مكوّن عرض بحت يستقبل الحالة والمبدّل من الصفحة (لا حالة داخلية) — يُستخدم داخل صفحات العميل.
 */

export interface SegmentedTab<T extends string> {
    id: T;
    label: string;
    icon?: LucideIcon;
}

interface SegmentedTabsProps<T extends string> {
    tabs: ReadonlyArray<SegmentedTab<T>>;
    active: T;
    onChange: (id: T) => void;
    className?: string;
}

export function SegmentedTabs<T extends string>({ tabs, active, onChange, className = '' }: SegmentedTabsProps<T>) {
    return (
        <div
            className={`inline-flex flex-wrap items-center gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-sm ${className}`}
            dir="rtl"
            role="tablist"
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === active;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                            isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
