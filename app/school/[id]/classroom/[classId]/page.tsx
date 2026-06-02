import React from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { getClassTimetable, getSchoolTeachers } from '@/app/_actions/coordinator-classroom';
import { TimetableEditor } from '@/components/coordinator/TimetableEditor';
import { supabaseAdmin } from '@/lib/db/supabase-admin';

interface PageProps {
    params: Promise<{ id: string; classId: string }>;
}

export default async function ClassTimetablePage(props: PageProps) {
    const params = await props.params;
    const { id: schoolId, classId } = params;

    // Parallel data fetching
    const [timetableRes, teachersRes, classRes] = await Promise.all([
        getClassTimetable({ classId }),
        getSchoolTeachers({ schoolId }),
        supabaseAdmin.from('classes').select('*').eq('id', classId).single()
    ]);

    type SlotData = { id: string; day: number; period: number; teacher_id: string | null; teacher?: { id: string; full_name: string }; subjects?: { id: string; name_ar: string }; subject_id: string; };
    type TeacherData = { id: string; full_name: string; email: string; };
    const slots = ((timetableRes.data ?? []) as unknown as SlotData[]);
    const teachers = ((teachersRes.data ?? []) as unknown as TeacherData[]);
    const classData = classRes.data;

    if (!classData) {
        return <div className="p-12 text-center text-red-500">الفصل غير موجود</div>;
    }

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
