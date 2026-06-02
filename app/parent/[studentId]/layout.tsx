import { redirect } from 'next/navigation';
import { getActivePersona } from '@/lib/auth/context-service';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';

// يتحقق من أن ولي الأمر مرتبط فعلاً بالطالب المطلوب قبل عرض أي بيانات
export default async function ParentStudentLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ studentId: string }>;
}) {
    const { studentId } = await params;

    const persona = await getActivePersona();
    if (!persona) redirect('/login');
    if (persona.role !== 'parent') redirect('/portal');

    const supabase = await createSupabaseServerClient();

    // ابحث عن سجل ولي الأمر عبر profile_id (M60)
    const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('profile_id', persona.userId)
        .maybeSingle();

    if (!guardian) redirect('/portal');

    // تحقق من وجود علاقة guardian ↔ student
    const { data: link } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', guardian.id)
        .eq('student_id', studentId)
        .maybeSingle();

    if (!link) redirect('/portal');

    return <>{children}</>;
}
