import { requireSchoolAdminAccess } from '@/lib/auth/school-page-guard';

// حارس أدقّ لمسارات إدارة الموظفين (staff · staff/new):
// system_owner + school_admin فقط — يستثني school_affairs_vp الذي يسمح به الحارس الأب.
export default async function SchoolStaffLayout({
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
