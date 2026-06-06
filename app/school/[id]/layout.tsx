import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import type { UserRole } from '@/lib/auth/roles';

/**
 * School Tenant Guard (Phase 2A)
 * ==============================
 * حارس مستأجر دفاعي لكل مسارات /school/[id]/*.
 *
 * يضمن — قبل عرض أي صفحة تابعة — أن:
 *   1. schoolId موجود وبصيغة UUID صحيحة (وإلا فشل مغلق).
 *   2. المستخدم مُصادَق عبر persona موثوقة من الخادم (app_metadata).
 *   3. الدور ضمن المجموعة المسموح لها بدخول شجرة /school (تطابق مالكي بادئة
 *      `/school` في ROLE_ACCESS_MAP): system_owner · school_admin · school_affairs_vp.
 *   4. عزل المستأجر: غير system_owner يجب أن تطابق schoolId الخاصة به المدرسةَ المطلوبة
 *      (نفس منطق validateSchoolAccess في lib/dashboard-data، مطبَّق بنداء persona واحد).
 *
 * ملاحظة معمارية: هذا الحارس طبقة دفاع متعمّق وليس الحدّ الأمني الوحيد. الحدّ الأصلي
 * لوصول المسار هو proxy.ts، وحدّ عزل البيانات هو طبقة الـ server actions / DAL.
 * لا يغيّر هذا الملف نموذج الهوية ولا active_persona.
 */

// الأدوار المسموح لها بدخول /school/[id]/* (مطابقة لمن يملك بادئة /school في ROLE_ACCESS_MAP)
const SCHOOL_SUBTREE_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
    'school_admin',
    'school_affairs_vp',
]);

// نمط UUID v4 — يُستخدم للفشل المغلق عند schoolId مفقود أو مشوّه
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SchoolTenantLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id: schoolId } = await params;

    // 1) فشل مغلق: schoolId مفقود أو ليس UUID صالحاً
    if (!schoolId || !UUID_REGEX.test(schoolId)) {
        redirect('/portal');
    }

    // 2) الهوية: persona موثوقة من الخادم
    const persona = await getActivePersona();
    if (!persona) redirect('/login');

    const isSystemOwner = persona.role === 'system_owner';

    // 3) بوابة الأدوار: مالك النظام أو أحد أدوار شجرة المدرسة فقط
    if (!isSystemOwner && !SCHOOL_SUBTREE_ROLES.has(persona.role)) {
        redirect('/portal');
    }

    // 4) عزل المستأجر: غير مالك النظام يجب أن تطابق مدرسته المدرسةَ المطلوبة
    if (!isSystemOwner && persona.schoolId !== schoolId) {
        redirect('/portal');
    }

    return <>{children}</>;
}
