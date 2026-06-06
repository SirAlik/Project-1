import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import type { UserRole } from '@/lib/auth/roles';

// نمط UUID v4 للفشل المغلق عند schoolId مفقود/مشوّه
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * حارس مسارات إدارة المدرسة (Phase 2C).
 * أدقّ من الحارس الأب `app/school/[id]/layout.tsx`: يقصر الوصول على
 * `system_owner` + `school_admin` فقط، فيستثني `school_affairs_vp` من صفحات
 * الإدارة (الموظفون · الفصول/الجدول) دون توسيع أي صلاحية.
 *
 * يُستخدم في nested layouts تحت `app/school/[id]/{staff,classroom}`.
 * يفشل مغلقاً (redirect) عند: schoolId غير صالح · غياب persona · دور غير مسموح ·
 * عدم تطابق المدرسة لغير system_owner.
 */
export async function requireSchoolAdminAccess(schoolId: string): Promise<void> {
    if (!schoolId || !UUID_REGEX.test(schoolId)) redirect('/portal');

    const persona = await getActivePersona();
    if (!persona) redirect('/login');

    const isSystemOwner = persona.role === 'system_owner';
    const ADMIN_ROLES: UserRole[] = ['school_admin'];

    if (!isSystemOwner && !ADMIN_ROLES.includes(persona.role)) redirect('/portal');
    if (!isSystemOwner && persona.schoolId !== schoolId) redirect('/portal');
}
