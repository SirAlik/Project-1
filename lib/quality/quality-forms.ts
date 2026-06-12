import type { UserRole } from '@/lib/auth/roles';

/**
 * ============================================================================
 * Quality Forms & Document Generation Layer  (طبقة نماذج الجودة وتوليد الوثائق)
 * ============================================================================
 *
 * طبقة معمارية عرضية في سِدرة: تحوّل بيانات العمل التشغيلي اليومي إلى **نماذج جودة رسمية**
 * قابلة للتصدير PDF (ترويسة رسمية · اسم المدرسة · التاريخ · رقم/رمز النموذج · جدول سجلات منظّم).
 *
 * تتغذّى هذه الطبقة من طبقتين:
 *   - Workflow Automation / Auto-Fill Engine  (محرّك الأتمتة والتعبئة التلقائية):
 *       إجراء تشغيلي → سجل سير عمل تلقائي → بيانات نموذج الجودة → تصدير PDF رسمي.
 *   - Analytics & Decision Layer + AI Decision Intelligence Layer:
 *       تجميعات حقيقية + رؤى Claude (لا فهرسة/تحليلات وهمية).
 *
 * ملاحظة Phase 1: هذا الملف **تعريف معماري (app-code) فقط** — لا يُولّد PDF ولا يلمس قاعدة البيانات.
 * النماذج غير الجاهزة تُعرض «قريباً» بصدق. بناء قوالب PDF الكاملة (وأي أعمدة/تخزين مطلوبة) مرحلة لاحقة.
 *
 * ملكية النماذج: أدوار تشغيلية/إدارية تملك تصدير نماذج الجودة الرسمية. المعلم/الطالب/ولي الأمر
 * (و«وكيل الشؤون المدرسية») قد يُغذّون البيانات لكنهم ليسوا مالكي التصدير الرسمي.
 */

// الأدوار التي تملك تصدير نماذج الجودة الرسمية
export const QUALITY_FORM_OWNER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
    'school_principal',
    'school_admin',
    'academic_vp',
    'student_affairs_vp',
    'school_secretary',
    'school_librarian',
    'student_counselor',
    'activity_leader',
    'health_coordinator',
    'quality_coordinator',
    'lab_technician',
]);

// أدوار مستثناة من ملكية نماذج الجودة (تُغذّي البيانات فقط)
export const QUALITY_FORM_EXCLUDED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
    'school_affairs_vp',
    'teacher',
    'student',
    'parent',
]);

export function ownsQualityForms(role: UserRole): boolean {
    return QUALITY_FORM_OWNER_ROLES.has(role);
}

export type QualityFormStatus = 'available' | 'planned';

export interface QualityFormDef {
    /** مفتاح داخلي ثابت */
    key: string;
    /** عنوان النموذج بالعربية (مرئي) */
    title: string;
    /** available = تصدير حقيقي مُنفَّذ الآن · planned = مخطّط، يُعرض «قريباً» بلا تزوير */
    status: QualityFormStatus;
    /** وصف مصدر البيانات الحقيقي (للشفافية المعمارية) */
    dataSource: string;
    /** هل مصدر البيانات موجود فعلاً (وإن لم يُبنَ قالب PDF بعد) */
    dataReady: boolean;
    /** ملاحظة صادقة (مثل اعتماد على محرّك التعبئة التلقائية) */
    note?: string;
}

/**
 * نماذج الجودة لمركز مصادر التعلم (school_librarian).
 * المتوفّر فعلياً الآن: شهادة التميّز (generateLRCCertificate). البقية مخطّطة (بياناتها موجودة،
 * قوالب PDF الرسمية تُبنى في مرحلة لاحقة) — تُعرض «قريباً» بلا أرقام نماذج أو PDF وهمية.
 */
export const LRC_QUALITY_FORMS: QualityFormDef[] = [
    {
        key: 'excellence_certificate',
        title: 'شهادة تميّز (الأكثر استعارة)',
        status: 'available',
        dataSource: 'lrc_loans (تجميع أكثر الطلاب استعارة)',
        dataReady: true,
        note: 'تصدير PDF حقيقي مُنفَّذ حالياً.',
    },
    {
        key: 'student_lending_register',
        title: 'سجل إعارة الطلاب',
        status: 'planned',
        dataSource: "lrc_loans (borrower_type = 'student')",
        dataReady: true,
    },
    {
        key: 'teacher_lending_register',
        title: 'سجل إعارة المعلمين',
        status: 'planned',
        dataSource: "lrc_loans (borrower_type = 'teacher')",
        dataReady: true,
    },
    {
        key: 'lrc_visit_register',
        title: 'سجل زيارات مركز المصادر',
        status: 'planned',
        dataSource: 'lrc_visits',
        dataReady: true,
    },
    {
        key: 'class_visit_attendance_form',
        title: 'كشف زيارة الفصل والحضور اليومي',
        status: 'planned',
        dataSource: 'lrc_visits + lrc_visit_attendance',
        dataReady: true,
        note: 'يتغذّى من محرّك التعبئة التلقائية (موافقة الحجز → زيارة → حضور). استبعاد الغياب/المأذونين يتطلب ربط مصدر الحضور لاحقاً.',
    },
    {
        key: 'booking_register',
        title: 'سجل حجوزات قاعة المصدر',
        status: 'planned',
        dataSource: 'lrc_bookings',
        dataReady: true,
    },
    {
        key: 'monthly_usage_report',
        title: 'التقرير الشهري للاستخدام',
        status: 'planned',
        dataSource: 'lrc_loans + lrc_visits + lrc_bookings (تجميعات شهرية)',
        dataReady: true,
    },
    {
        key: 'catalog_inventory_report',
        title: 'تقرير فهرس/جرد الكتب',
        status: 'planned',
        dataSource: 'lrc_books',
        dataReady: true,
    },
    {
        key: 'overdue_report',
        title: 'تقرير الكتب المتأخرة',
        status: 'planned',
        dataSource: "lrc_loans (status = 'overdue')",
        dataReady: true,
    },
];
