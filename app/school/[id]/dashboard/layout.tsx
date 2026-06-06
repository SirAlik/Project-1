import { requireSchoolAdminAccess } from '@/lib/auth/school-page-guard';

// حارس أدقّ للوحة إدارة المدرسة: system_owner + school_admin فقط.
// يستثني school_affairs_vp (تشغيلي) من لوحة الإدارة التي يسمح بها الحارس الأب.
export default async function SchoolDashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await requireSchoolAdminAccess(id);
    return <>{children}</>;
}
