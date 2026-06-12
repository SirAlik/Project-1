import {
    LayoutDashboard,
    Users,
    Layers,
    Settings2,
    Upload,
    FileSpreadsheet,
    GraduationCap,
    Mail,
    BarChart3,
    type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/auth/roles';

/**
 * تنقّل لوحة المدرسة (طبقة عرض فقط).
 * مصدر واحد لعناصر الشريط الجانبي حسب الدور والمسارات الحقيقية الموجودة فعلاً في شجرة app/.
 *
 * قواعد صارمة:
 *  - لا روابط لمسارات غير موجودة. أي عنصر مخطّط بلا مسار → `href: null` + `comingSoon: true` (يُعرض «قريباً» معطّلاً).
 *  - المسارات هنا تطابق ROLE_ACCESS_MAP لمنسق المدرسة: شجرة `/school/[id]/*` + `/bulk-upload`.
 */

export interface SchoolNavItem {
    label: string;        // تسمية عربية مرئية
    href: string | null;  // null = مخطّط بلا مسار بعد (يُعرض معطّلاً)
    icon: LucideIcon;
    comingSoon?: boolean;
}

export interface SchoolNavGroup {
    title: string;
    items: SchoolNavItem[];
}

// تنقّل منسق المدرسة (school_admin) — جميع الروابط لمسارات حقيقية مؤكَّدة في شجرة app/.
function adminNav(schoolId: string): SchoolNavGroup[] {
    const base = `/school/${schoolId}`;
    return [
        {
            title: 'نظرة عامة',
            items: [
                { label: 'الرئيسية', href: `${base}/dashboard`, icon: LayoutDashboard },
            ],
        },
        {
            title: 'إدارة المدرسة',
            items: [
                { label: 'الموظفون', href: `${base}/staff`, icon: Users },
                { label: 'الفصول', href: `${base}/classroom`, icon: Layers },
                { label: 'الهيكل الأكاديمي', href: `${base}/academic-setup`, icon: Settings2 },
                { label: 'استيراد البيانات', href: `${base}/setup`, icon: Upload },
                { label: 'الرفع الجماعي', href: '/bulk-upload', icon: FileSpreadsheet },
            ],
        },
        {
            // عناصر مخطّطة بلا مسارات حقيقية بعد — تُعرض «قريباً» معطّلة (بلا روابط وهمية).
            title: 'قريباً',
            items: [
                { label: 'الطلاب', href: null, icon: GraduationCap, comingSoon: true },
                { label: 'الدعوات', href: null, icon: Mail, comingSoon: true },
                { label: 'التقارير', href: null, icon: BarChart3, comingSoon: true },
            ],
        },
    ];
}

/**
 * يُعيد عناصر الشريط الجانبي حسب الدور.
 * حالياً تصل هذه اللوحة فقط أدوار `school_admin` + `system_owner` (محروسة بـ requireSchoolAdminAccess)،
 * فكلاهما يحصل على تنقّل الإدارة الكامل. البنية role-aware لتوسّع مستقبلي لبقية أدوار المدرسة.
 */
export function getSchoolNav(role: UserRole, schoolId: string): SchoolNavGroup[] {
    switch (role) {
        case 'school_admin':
        case 'system_owner':
            return adminNav(schoolId);
        default:
            // أدوار أخرى لا تملك هذه اللوحة حالياً؛ نظرة عامة آمنة فقط (بلا كشف مسارات إدارة).
            return [
                {
                    title: 'نظرة عامة',
                    items: [
                        { label: 'الرئيسية', href: `/school/${schoolId}/dashboard`, icon: LayoutDashboard },
                    ],
                },
            ];
    }
}
