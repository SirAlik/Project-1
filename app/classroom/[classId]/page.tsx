import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { ClassroomWorkspace } from './_components/ClassroomWorkspace';

// المسار الفعلي للفصل = classes.id (UUID). صفحة الاختيار (app/classroom/page.tsx)
// تربط دائماً بـ /classroom/<classes.id> — فحُلَّ هنا الفصل الحقيقي خادمياً وتحقّق:
//   1. classId UUID صالح
//   2. الفصل ضمن مدرسة المُستدعي (RLS يحصر classes على get_my_school_id)
//   3. المعلّم مُسنَد لهذا الفصل (teacher_assignments) — ملكية فوق RLS
// أي إخفاق → notFound() (فشل-مغلق) بدل تمرير classId غير مرتبط للعميل.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
    params: Promise<{ classId: string }>;
}

export default async function ClassroomDetailPage({ params }: PageProps) {
    const { classId } = await params;

    const persona = await getActivePersona();
    if (!persona?.schoolId) notFound();
    if (!UUID_RE.test(classId)) notFound();

    const supabase = await createSupabaseServerClient();

    const { data: cls } = await supabase
        .from('classes')
        .select('id, name, grade_level, section')
        .eq('id', classId)
        .maybeSingle();
    if (!cls) notFound();

    const { data: assignment } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('class_id', classId)
        .eq('teacher_id', persona.userId)
        .limit(1)
        .maybeSingle();
    if (!assignment) notFound();

    return (
        <ClassroomWorkspace
            classId={cls.id as string}
            className={(cls.name as string) ?? ''}
            grade={(cls.grade_level as number | null) ?? null}
            section={(cls.section as string | null) ?? null}
        />
    );
}
