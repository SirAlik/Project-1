import type { ReactNode } from 'react';

/**
 * DashboardGrid — شبكة استجابية موحّدة لبطاقات المؤشّرات/الإجراءات.
 *
 * تستبدل تكرار `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` المبعثر عبر الصفحات.
 */

interface DashboardGridProps {
    /** عدد الأعمدة على الشاشات الكبيرة (2 · 3 · 4). */
    cols?: 2 | 3 | 4;
    children: ReactNode;
    className?: string;
}

const COLS: Record<NonNullable<DashboardGridProps['cols']>, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
};

export function DashboardGrid({ cols = 4, children, className = '' }: DashboardGridProps) {
    return <div className={`grid gap-4 ${COLS[cols]} ${className}`}>{children}</div>;
}
