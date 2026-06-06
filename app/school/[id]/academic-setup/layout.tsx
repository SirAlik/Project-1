import { requireSchoolAdminAccess } from '@/lib/auth/school-page-guard';

// حارس أدقّ للإعداد الأكاديمي (المراحل/الحصص/الفصول): system_owner + school_admin فقط.
// يستثني school_affairs_vp (تشغيلي). ملاحظة: هذا المجال مفهومياً يخصّ academic_vp، لكنه يعيش
// حالياً ضمن شجرة admin؛ منح academic_vp وصولاً مخصّصاً مؤجَّل (موثّق لمرحلة لاحقة).
export default async function SchoolAcademicSetupLayout({
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
