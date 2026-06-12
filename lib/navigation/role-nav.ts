import {
    LayoutDashboard,
    BarChart3,
    Users,
    CalendarCheck,
    FileWarning,
    ClipboardCheck,
    type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth/roles';

/**
 * تنقّل لوحات الأدوار (طبقة عرض فقط) — يغذّي RoleDashboardShell.
 *
 * قواعد صارمة (متّسقة مع school-nav.ts):
 *  - لا روابط لمسارات غير موجودة فعلاً في شجرة app/. أي عنصر مخطّط بلا مسار → href: null + comingSoon.
 *  - التسميات العربية المرئية هنا للروابط (أقسام/صفحات)، أمّا تسمية الدور نفسه فتأتي دائماً من
 *    getRoleInfo(role).labelAr في الـ shell (مصدر واحد، بلا تكرار).
 *  - المسارات أدناه مؤكَّدة بالوجود في شجرة app/ (page.tsx).
 */

export interface RoleNavItem {
    label: string;
    href: string | null;
    icon: LucideIcon;
    comingSoon?: boolean;
}

export interface RoleNavGroup {
    title: string;
    items: RoleNavItem[];
}

const home = (href: string): RoleNavGroup => ({
    title: 'نظرة عامة',
    items: [{ label: 'الرئيسية', href, icon: LayoutDashboard }],
});

/** يُعيد عناصر الشريط الجانبي حسب الدور — مسارات حقيقية فقط. */
export function getRoleNav(role: UserRole): RoleNavGroup[] {
    switch (role) {
        case 'school_principal':
            return [
                home('/principal'),
                {
                    title: 'التحليلات',
                    items: [
                        { label: 'الأكاديمي', href: '/principal/analytics/academic', icon: BarChart3 },
                        { label: 'النشاط', href: '/principal/analytics/activity', icon: BarChart3 },
                        { label: 'الإرشاد', href: '/principal/analytics/counselor', icon: BarChart3 },
                        { label: 'الصحة', href: '/principal/analytics/health', icon: BarChart3 },
                        { label: 'المختبر', href: '/principal/analytics/lab', icon: BarChart3 },
                        { label: 'مصادر التعلم', href: '/principal/analytics/lrc', icon: BarChart3 },
                        { label: 'السكرتارية', href: '/principal/analytics/secretary', icon: BarChart3 },
                        { label: 'شؤون الطلاب', href: '/principal/analytics/student-affairs', icon: BarChart3 },
                        { label: 'المعلمون', href: '/principal/analytics/teachers', icon: Users },
                    ],
                },
                {
                    title: 'الأداء',
                    items: [{ label: 'تقييم الأداء', href: '/staff-evaluation', icon: ClipboardCheck }],
                },
            ];
        case 'school_secretary':
            return [
                home('/secretary'),
                {
                    title: 'العمليات',
                    items: [
                        { label: 'حضور الموظفين', href: '/secretary/staff-attendance', icon: CalendarCheck },
                        { label: 'تذاكر المساءلة', href: '/secretary/hr-tickets', icon: FileWarning },
                    ],
                },
            ];
        case 'quality_coordinator':
            return [
                home('/qa'),
                {
                    title: 'الجودة',
                    items: [
                        { label: 'الإجراءات التصحيحية', href: '/qa/corrective-action', icon: FileWarning },
                    ],
                },
            ];
        case 'student_affairs_vp':
            return [
                home('/student-affairs'),
                {
                    title: 'العمليات',
                    items: [
                        { label: 'الحضور اليومي', href: '/student-affairs/attendance', icon: CalendarCheck },
                    ],
                },
            ];
        case 'teacher':
            return [
                home('/classroom'),
                {
                    title: 'التدريس',
                    items: [{ label: 'التحليلات', href: '/classroom/analytics', icon: BarChart3 }],
                },
            ];
        case 'academic_vp':
            return [home('/educational')];
        case 'student_counselor':
            return [home('/counselor')];
        case 'health_coordinator':
            return [home('/health')];
        case 'lab_technician':
            return [home('/science')];
        case 'activity_leader':
            return [home('/activity')];
        default:
            return [];
    }
}
