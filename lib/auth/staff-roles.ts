import type { UserRole } from './roles';

/**
 * أدوار المدرسة القابلة للإسناد للمنسوبين (Staff) — المصدر الواحد المعتمد.
 *
 * كل أدوار المدرسة التشغيلية، باستثناء:
 *  - `system_owner`      → دور عالمي (authority في app_metadata)، لا يُسنَد أبداً من نموذج مدرسي.
 *  - `student` · `parent` → ليسا دوري منسوبين، ويتطلبان سجلات طالب/ولي أمر مرتبطة.
 *
 * يُستخدم في: نموذج «إضافة موظف» · إجراء createStaff الخادمي · أداة اختبار مالك النظام (عبر إعادة تصدير).
 * طبقة العرض تشتقّ التسميات العربية من getRoleInfo(role).labelAr — لا مفاتيح إنجليزية خام في الواجهة.
 */
export const STAFF_ASSIGNABLE_ROLES: UserRole[] = [
    'school_admin',
    'school_principal',
    'school_affairs_vp',
    'academic_vp',
    'student_affairs_vp',
    'school_secretary',
    'student_counselor',
    'health_coordinator',
    'lab_technician',
    'school_librarian',
    'activity_leader',
    'quality_coordinator',
    'teacher',
];

const STAFF_ASSIGNABLE_SET = new Set<UserRole>(STAFF_ASSIGNABLE_ROLES);

/** حارس نوعي: هل هذا المفتاح دوراً مدرسياً قابلاً لإسناده للمنسوبين؟ (يستبعد system_owner/student/parent). */
export function isStaffAssignableRole(role: string): role is UserRole {
    return STAFF_ASSIGNABLE_SET.has(role as UserRole);
}
