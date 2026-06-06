import { requireSchoolAdminAccess } from '@/lib/auth/school-page-guard';

// حارس أدقّ لصفحة الاستيراد المجمّع: system_owner + school_admin فقط.
// يستثني school_affairs_vp (تشغيلي) من عمليات الإعداد/الاستيراد الإدارية.
export default async function SchoolSetupLayout({
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
