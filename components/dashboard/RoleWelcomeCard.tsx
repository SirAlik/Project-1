import type { ReactNode } from 'react';
import { getRoleInfo, type UserRole } from '@/lib/auth/roles';
import { getRoleDashboardMeta } from '@/lib/dashboard/role-dashboard';
import { PageHeader } from './PageHeader';

/**
 * RoleWelcomeCard — ترويسة ترحيب موحّدة مدفوعة بإعداد الدور (lib/dashboard/role-dashboard.ts).
 *
 * تختصر التكرار: تستمدّ الأيقونة من getRoleInfo والعنوان/الفرعي من ROLE_DASHBOARD_META، وتسمح
 * بتجاوزهما (title/subtitle) عند الحاجة. تُبنى فوق PageHeader المشترك — نظام بصري واحد لكل الأدوار.
 */

interface RoleWelcomeCardProps {
    role: UserRole;
    /** تجاوز العنوان الافتراضي للدور. */
    title?: ReactNode;
    /** تجاوز العنوان الفرعي الافتراضي. */
    subtitle?: ReactNode;
    /** سطر علوي صغير. */
    kicker?: string;
    actions?: ReactNode;
    trailing?: ReactNode;
    className?: string;
}

export function RoleWelcomeCard({ role, title, subtitle, kicker, actions, trailing, className }: RoleWelcomeCardProps) {
    const meta = getRoleDashboardMeta(role);
    const info = getRoleInfo(role);

    return (
        <PageHeader
            icon={info.icon}
            kicker={kicker ?? info.labelAr}
            title={title ?? meta?.title ?? info.labelAr}
            subtitle={subtitle ?? meta?.subtitle}
            actions={actions}
            trailing={trailing}
            className={className}
        />
    );
}
