import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Users } from 'lucide-react';
import { getClassTimetable, getSchoolTeachers } from '@/app/_actions/coordinator-classroom';
import { TimetableEditor } from '@/components/coordinator/TimetableEditor';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { validateSchoolAccess } from '@/lib/dashboard-data';

interface PageProps {
    params: Promise<{ id: string; classId: string }>;
}

export default async function ClassTimetablePage(props: PageProps) {
    const params = await props.params;
    const { id: schoolId, classId } = params;

    // 1) دفاع متعمّق: تأكد أن المستخدم يملك وصولاً لهذه المدرسة (لا نعتمد على الـ layout وحده)
    const { valid } = await validateSchoolAccess(schoolId);
    if (!valid) redirect('/portal');

    // 2) عزل المستأجر: الفصل يجب أن يتبع هذه المدرسة تحديداً قبل جلب أي بيانات تابعة.
    //    supabaseAdmin يتجاوز RLS، لذا القيد الصريح على school_id إلزامي هنا.
    const { data: classData } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('school_id', schoolId)
        .maybeSingle();

    // فشل مغلق: فصل غير موجود أو يتبع مدرسة أخرى → notFound (لا نكشف وجوده في مدرسة أخرى)
    if (!classData) notFound();

    // 3) بعد إثبات ملكية الفصل للمدرسة، اجلب الجدول والمعلمين (كلاهما مقيَّد بـ school_id)
    const [timetableRes, teachersRes] = await Promise.all([
        getClassTimetable({ classId, schoolId }),
        getSchoolTeachers({ schoolId }),
    ]);

    type SlotData = { id: string; day: number; period: number; teacher_id: string | null; teacher?: { id: string; full_name: string }; subjects?: { id: string; name_ar: string }; subject_id: string; };
    type TeacherData = { id: string; full_name: string; email: string; };
    const slots = ((timetableRes.data ?? []) as unknown as SlotData[]);
    const teachers = ((teachersRes.data ?? []) as unknown as TeacherData[]);

    return (
        <main className="min-h-screen text-[var(--text)] p-8 lg:p-12" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm opacity-50 mb-6">
                    <Link href={`/school/${schoolId}/classroom`} className="hover:text-[var(--primary)] transition-colors">
                        إدارة الفصول
                    </Link>
                    <ChevronRight size={14} />
                    <span className="font-bold text-foreground">{classData.name}</span>
                </div>

                {/* Header */}
                <header className="mb-12 flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-4">
                            <span className="text-[var(--primary)]">{classData.name}</span>
                            <span className="text-lg opacity-40 font-normal px-3 py-1 rounded-full border border-stone-200">
                                {classData.grade_level}
                            </span>
                        </h1>
                        <p className="opacity-60 text-sm">
                            إدارة الجدول الدراسي وتوزيع حصص المعلمين لهذا الفصل.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="glass-panel px-4 py-2 flex items-center gap-3">
                            <Users size={16} className="text-[var(--primary)]" />
                            <span className="text-sm font-bold">{teachers.length} معلم مسجل</span>
                        </div>
                    </div>
                </header>

                {/* Editor */}
                <TimetableEditor
                    slots={slots}
                    teachers={teachers}
                    classId={classId}
                />
            </div>
        </main>
    );
}
