import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

// يتحقق أن المستخدم معلم وأن له تكليفاً في هذا الفصل
// ملاحظة: params.grade يستقبل class UUID من صفحة الاختيار
export default async function ClassroomLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ grade: string }>;
}) {
    const { grade: classParam } = await params;

    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'teacher') redirect('/portal');
    if (!persona.schoolId) redirect('/portal');

    const supabase = await createSupabaseServerClient();

    // تحقق من أن هذا المعلم مكلَّف بهذا الفصل
    const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', persona.userId)
        .eq('class_id', classParam)
        .maybeSingle();

    if (!assignment) redirect('/classroom');

    return <>{children}</>;
}
