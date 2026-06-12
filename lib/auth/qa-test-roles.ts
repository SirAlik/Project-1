import type { UserRole } from './roles';
import { STAFF_ASSIGNABLE_ROLES, isStaffAssignableRole } from './staff-roles';

/**
 * أدوار قابلة للإسناد عبر «أداة اختبار مالك النظام» (Pre-launch QA).
 *
 * هي نفسها أدوار المنسوبين القابلة للإسناد (مصدر واحد في staff-roles.ts) — لا تكرار:
 * كل أدوار المدرسة التشغيلية، باستثناء system_owner (عالمي) و student/parent (يتطلبان سجلات مرتبطة).
 */
export const QA_ASSIGNABLE_ROLES: UserRole[] = STAFF_ASSIGNABLE_ROLES;

/** أدوار محدودة لا تُسنَد آلياً (تتطلب سجلات مرتبطة) — تُعرض للتوضيح فقط. */
export const QA_LIMITED_ROLES: UserRole[] = ['student', 'parent'];

/** حارس نوعي: هل هذا المفتاح دوراً مدرسياً قابلاً للإسناد عبر أداة الاختبار؟ */
export function isAssignableQaRole(role: string): role is UserRole {
    return isStaffAssignableRole(role);
}
