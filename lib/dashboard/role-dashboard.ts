import type { UserRole } from '@/lib/auth/roles';
import type { QualityModule } from '@/lib/quality/tenant-templates';

/**
 * ============================================================================
 * Role Dashboard Configuration  (طبقة إعداد لوحات الأدوار) — UI Unification
 * ============================================================================
 *
 * مصدر واحد لـ«محتوى» لوحة كل دور الإداري: العنوان · العنوان الفرعي · وحدة الجودة المملوكة.
 * الهدف: نقل الاختلافات بين الأدوار إلى **بيانات إعداد** بدل تكرار `if role === ...` أو أنظمة
 * بصرية متعددة. الصدفة (RoleDashboardShell/SchoolDashboardShell) والمكوّنات المشتركة
 * (components/dashboard/*) تبقى واحدة؛ هذا الملف يغذّيها بالمحتوى الخاص بالدور.
 *
 * قواعد:
 *  - `qualityModule` يطابق سجلّ المستأجر (lib/quality/tenant-templates.ts) وملكية الأدوار
 *    (lib/quality/quality-forms.ts · QUALITY_FORM_OWNER_ROLES). الأدوار المستثناة من ملكية
 *    نماذج الجودة (school_affairs_vp · teacher · student · parent) تُترك `qualityModule: null`.
 *  - الإتاحة الفعلية fail-closed عبر isQualityEnabled(schoolId) داخل QualityOwnerPanel — هذا
 *    الإعداد يحدّد «أيّ وحدة» فقط، لا «هل مفعّلة».
 *  - app-code فقط — لا قاعدة بيانات ولا مفاتيح أدوار جديدة.
 */

export interface RoleDashboardMeta {
    /** عنوان لوحة الدور (مرئي في PageHeader). */
    title: string;
    /** العنوان الفرعي. */
    subtitle: string;
    /** وحدة الجودة التي يملكها الدور (أو null لغير المالك/المستثنى). */
    qualityModule: QualityModule | null;
    /** تسمية وحدة الجودة المرئية في QualityOwnerPanel. */
    qualityModuleLabel: string | null;
}

/**
 * بيانات لوحات الأدوار الإدارية. مفاتيح الأدوار من lib/auth/roles.ts (بلا تغيير).
 * أدوار بلا لوحة موحّدة بعد (student/parent/teacher landing) تُترك خارج الخريطة.
 */
export const ROLE_DASHBOARD_META: Partial<Record<UserRole, RoleDashboardMeta>> = {
    school_principal: {
        title: 'مكتب مدير المدرسة',
        subtitle: 'غرفة القيادة: المؤشّرات التشغيلية والتحليلات والتنقّل عبر مجالات المدرسة.',
        qualityModule: 'principal',
        qualityModuleLabel: 'القيادة المدرسية',
    },
    academic_vp: {
        title: 'الشؤون التعليمية',
        subtitle: 'متابعة المجالات التعليمية ونماذج الجودة بعد ربطها بمصادر بيانات حقيقية.',
        qualityModule: 'academic',
        qualityModuleLabel: 'الشؤون التعليمية',
    },
    student_affairs_vp: {
        title: 'شؤون الطلاب',
        subtitle: 'الحضور والسلوك والقضايا والعهد الطلابية في مكان واحد.',
        // student_affairs_vp يملك نماذج جودة (module student_affairs) لكن لوحته لا تعرض QualityOwnerPanel
        // المشتركة حالياً (السطح الخاص بها قيد التوحيد) — تبقى null هنا حتى لا يُحقن سطح مكرّر.
        qualityModule: null,
        qualityModuleLabel: null,
    },
    school_secretary: {
        title: 'السكرتارية المدرسية',
        subtitle: 'المراسلات الرسمية وإجازات الموظفين والطلبات الإدارية.',
        qualityModule: 'secretary',
        qualityModuleLabel: 'السكرتارية',
    },
    quality_coordinator: {
        title: 'ضمان الجودة',
        subtitle: 'الملاحظات الصفّية ومؤشّرات الأداء والإجراءات التصحيحية.',
        qualityModule: 'qa',
        qualityModuleLabel: 'ضمان الجودة',
    },
    health_coordinator: {
        title: 'الصحة المدرسية',
        subtitle: 'العيادة والمخزون والامتثال الصحي وتقارير الجودة.',
        qualityModule: 'health',
        qualityModuleLabel: 'الصحة المدرسية',
    },
    lab_technician: {
        title: 'المختبر العلمي',
        subtitle: 'حجوزات المختبر والمخزون وسجلّات الجودة.',
        qualityModule: 'science',
        qualityModuleLabel: 'المختبر العلمي',
    },
    activity_leader: {
        title: 'وحدة رائد النشاط',
        subtitle: 'الأندية والفعاليات والميزانية وتكريم الطلاب.',
        qualityModule: 'activity',
        qualityModuleLabel: 'النشاط الطلابي',
    },
    student_counselor: {
        title: 'التوجيه والإرشاد الطلابي',
        subtitle: 'الحالات والجلسات وتقارير أولياء الأمور ونماذج الإرشاد.',
        qualityModule: 'counseling',
        qualityModuleLabel: 'التوجيه الطلابي',
    },
    school_librarian: {
        title: 'مركز مصادر التعلّم',
        subtitle: 'الإعارة والزيارات والحجوزات وسجلّات المركز.',
        qualityModule: 'lrc',
        qualityModuleLabel: 'مصادر التعلّم',
    },
    school_admin: {
        title: 'لوحة تشغيل المدرسة',
        subtitle: 'إدارة بيانات المدرسة الأساسية والإعداد والتنسيق التشغيلي.',
        qualityModule: 'school_admin',
        qualityModuleLabel: 'التنسيق المدرسي',
    },
};

/** بيانات لوحة دور (أو null إن لم يكن للدور لوحة موحّدة بعد). */
export function getRoleDashboardMeta(role: UserRole): RoleDashboardMeta | null {
    return ROLE_DASHBOARD_META[role] ?? null;
}
