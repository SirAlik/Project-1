import {
    Shield,
    User,
    Settings,
    Book,
    Users,
    BookOpen,
    GraduationCap,
    Heart,
    FileText,
    FlaskConical,
    CheckCircle,
    Star,
    Activity,
    LucideIcon
} from 'lucide-react';

export type GlobalRole = 'system_owner';

export type SchoolRole =
    | 'school_admin'
    | 'school_librarian'
    | 'student_affairs_vp'
    | 'academic_vp'
    | 'school_affairs_vp'
    | 'school_principal'
    | 'teacher'
    | 'student'
    | 'parent'
    | 'school_secretary'
    | 'student_counselor'
    | 'health_coordinator'
    | 'lab_technician'
    | 'activity_leader'
    | 'quality_coordinator';

export type UserRole = GlobalRole | SchoolRole;
// Alias kept for shared type imports; prefer UserRole in new code.
export type Role = UserRole;

export const GLOBAL_ROLES = new Set<UserRole>(['system_owner']);

export const SCHOOL_ROLES = new Set<UserRole>([
    'school_admin',
    'school_librarian',
    'student_affairs_vp',
    'academic_vp',
    'school_affairs_vp',
    'school_principal',
    'teacher',
    'student',
    'parent',
    'school_secretary',
    'student_counselor',
    'health_coordinator',
    'lab_technician',
    'activity_leader',
    'quality_coordinator',
]);

export const ALL_ROLES = new Set<UserRole>([...GLOBAL_ROLES, ...SCHOOL_ROLES]);

export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
    // Global
    system_owner: '/admin/dashboard',

    // School Leadership
    // ملاحظة: school_admin وschool_affairs_vp يُحلّان ديناميكياً إلى مسار المدرسة
    // (`/school/[id]/dashboard` و`/school/[id]/school-affairs`) عبر getDashboardPath
    // في app/api/persona/select وapp/_actions/switch-persona. القيمة هنا بديل ثابت
    // (hub بوابة) لأن لوحتيهما مرتبطتان بـ schoolId الديناميكي ولا تملكان مساراً ثابتاً.
    school_admin: '/portal',
    school_principal: '/principal',
    school_affairs_vp: '/portal',
    academic_vp: '/educational',
    student_affairs_vp: '/student-affairs',

    // Specialized
    school_librarian: '/lrc',
    school_secretary: '/secretary',
    student_counselor: '/counselor',
    health_coordinator: '/health',
    lab_technician: '/science',
    activity_leader: '/activity',
    quality_coordinator: '/qa',

    // Core
    teacher: '/classroom',
    student: '/student',
    parent: '/parent',
};

// ============================================================
// مصفوفة وصول الأدوار حسب المجال (Role–Domain Access Matrix) — Phase 2D
// المرجع الموحَّد لملكية المجالات. الإنفاذ موزَّع (proxy + layouts + page guards + action role
// arrays)، لكن هذا الجدول هو المصدر الواحد لتصحيح أي انحراف لاحق:
//
//  system_owner       → منصة كاملة (wildcard) — لا يخصّ مستأجراً بعينه.
//  school_admin       → إدارة المستأجر التشغيلية: /school/[id]/* كاملة + /portal.
//  school_principal   → إشراف قيادي واسع (قراءة) عبر المجالات.
//  academic_vp        → الشؤون التعليمية: /educational + /classroom (تدريسي) + /qa (جودة التعليم).
//                       ملاحظة: academic-setup والجدول يعيشان حالياً تحت شجرة admin (/school)، لذا
//                       لم تُمنح ملكيتهما لـ academic_vp الآن (تجنّب خلط صلاحيات admin) — موثّقة كصفحات مستقبلية.
//  school_affairs_vp  → الشؤون المدرسية التشغيلية فقط: /school/[id]/school-affairs (+ /portal).
//                       لا يملك: الموظفين · الفصول · الإعداد الأكاديمي · الجودة · شؤون الطلاب.
//  student_affairs_vp → شؤون الطلاب: /student-affairs (+ سياقات داعمة).
//  teacher            → /classroom (طاولة عمل المعلم).  student/parent → بواباتهما الشخصية فقط.
//  المتخصّصون (librarian/secretary/counselor/health/lab/activity/quality) → نطاق مجالهم فقط.
// ============================================================
export const ROLE_ACCESS_MAP: Record<UserRole, string[]> = {
    system_owner: ['*'],
    school_admin: ['/school', '/portal'],
    school_librarian: ['/lrc'],
    school_principal: ['/principal', '/qa', '/parent', '/classroom', '/student-affairs', '/science', '/health', '/lrc'],
    // (Phase 2D) تضييق: وكيل الشؤون المدرسية تشغيلي فقط — أُزيل /student-affairs و/classroom و/qa.
    // وصوله إلى /school محصور داخلياً بصفحة school-affairs عبر nested guards (بقية صفحات /school محروسة admin-only).
    school_affairs_vp: ['/school', '/portal'],
    academic_vp: ['/educational', '/qa', '/classroom'],
    student_affairs_vp: ['/student-affairs', '/classroom', '/qa', '/parent', '/secretary'],
    teacher: ['/classroom'],
    student: ['/student'],
    parent: ['/parent'],
    school_secretary: ['/secretary'],
    student_counselor: ['/counselor', '/qa', '/parent'],
    health_coordinator: ['/health'],
    lab_technician: ['/science'],
    activity_leader: ['/activity'],
    quality_coordinator: ['/qa'],
};

export function normalizeRole(role: string): UserRole | null {
    if (ALL_ROLES.has(role as UserRole)) return role as UserRole;
    return null;
}

export interface RoleInfo {
    label: string;
    labelAr: string;
    icon: LucideIcon;
}

export function getRoleInfo(role: UserRole): RoleInfo {
    const map: Record<UserRole, RoleInfo> = {
        system_owner: { label: 'System Owner', labelAr: 'مالك النظام', icon: Shield },
        school_admin: { label: 'School Admin', labelAr: 'منسق المدرسة', icon: Settings },
        school_principal: { label: 'School Principal', labelAr: 'مدير المدرسة', icon: User },
        school_affairs_vp: { label: 'VP School Affairs', labelAr: 'وكيل الشؤون المدرسية', icon: Users },
        academic_vp: { label: 'VP Academic', labelAr: 'وكيل الشؤون التعليمية', icon: BookOpen },
        student_affairs_vp: { label: 'VP Student Affairs', labelAr: 'وكيل شؤون الطلاب', icon: Users },
        school_librarian: { label: 'School Librarian', labelAr: 'أمين مصادر التعلم', icon: Book },
        school_secretary: { label: 'School Secretary', labelAr: 'سكرتير المدرسة', icon: FileText },
        student_counselor: { label: 'Student Counselor', labelAr: 'الموجه الطلابي', icon: Heart },
        health_coordinator: { label: 'Health Coordinator', labelAr: 'الموجه الصحي', icon: Activity },
        lab_technician: { label: 'Lab Technician', labelAr: 'محضر المختبر', icon: FlaskConical },
        activity_leader: { label: 'Activity Leader', labelAr: 'رائد النشاط', icon: Star },
        quality_coordinator: { label: 'Quality Coordinator', labelAr: 'منسق الجودة', icon: CheckCircle },
        teacher: { label: 'Teacher', labelAr: 'معلم', icon: BookOpen },
        student: { label: 'Student', labelAr: 'الطالب', icon: GraduationCap },
        parent: { label: 'Parent', labelAr: 'ولي الأمر', icon: Users },
    };

    return map[role] || { label: 'Unknown', labelAr: 'غير معروف', icon: User };
}
