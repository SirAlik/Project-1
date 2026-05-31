import React from 'react';
import Link from 'next/link';
import { School, Layers, ChevronLeft, CalendarClock, Upload } from 'lucide-react';
import { getSchoolClassrooms } from '@/app/_actions/coordinator-classroom';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CoordinatorClassroomPage(props: PageProps) {
    const params = await props.params;
    const schoolId = params.id;

    // Fetch data
    const result = await getSchoolClassrooms({ schoolId });
    const classrooms = result.data || [];

    if (result.serverError || result.validationErrors) {
        console.error('[ClassroomPage] Action Failed:', result.serverError || result.validationErrors);
    }
    interface ClassItem { id: string; name: string; grade_level: number; gender?: string | null; }
    const safeClassrooms = (Array.isArray(classrooms) ? classrooms : []) as ClassItem[];

    return (
        <main className="min-h-screen text-foreground p-8 lg:p-12" dir="rtl">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                        <School className="text-primary w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground">
                        إدارة الفصول والجداول
                    </h1>
                    <p className="opacity-60 text-sm font-medium max-w-2xl leading-relaxed text-muted-foreground">
                        مركز التحكم بالحصص الدراسية - قم باختيار أي فصل لاستعراض الجدول الدراسي وتعيين المعلمين للحصص الشاغرة.
                    </p>
                </header>

                <div className="flex justify-end mb-6">
                    <form action={async () => {
                        'use server';
                        const { resetSchoolClasses } = await import('@/app/_actions/coordinator-classroom');
                        await resetSchoolClasses({ schoolId });
                    }}>
                        <button className="text-xs text-destructive hover:text-destructive/80 underline opacity-50 hover:opacity-100 transition-opacity">
                            (Danger) إعادة تعيين الفصول
                        </button>
                    </form>
                </div>

                {/* Error Alert */}
                {(result.serverError || result.validationErrors) && (
                    <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
                        <h3 className="font-bold mb-1">حدث خطأ في جلب البيانات</h3>
                        <p className="text-sm opacity-80">
                            {result.serverError || JSON.stringify(result.validationErrors)}
                        </p>
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {safeClassrooms.length === 0 ? (
                        <div className="col-span-full bg-card border border-border p-20 text-center border-dashed opacity-50 flex flex-col items-center justify-center rounded-3xl">
                            <Layers className="w-16 h-16 mx-auto mb-6 opacity-30 text-muted-foreground" />
                            <h3 className="text-xl font-bold mb-2 text-foreground">لا توجد فصول دراسية</h3>
                            <p className="text-sm opacity-60 max-w-md mx-auto mb-8 text-muted-foreground">
                                البدء بإنشاء الفصول الدراسية وتوزيع الطلاب.
                            </p>
                            <Link
                                href={`/school/${schoolId}/classroom/new`}
                                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Upload size={18} />
                                <span>إنشاء أول صف دراسي</span>
                            </Link>
                        </div>
                    ) : (
                        safeClassrooms.map((cls) => (
                            <Link key={cls.id} href={`/school/${schoolId}/classroom/${cls.id}`}>
                                <div className="bg-card border border-border p-8 hover:border-primary/50 hover:bg-muted/5 transition-all cursor-pointer group relative overflow-hidden h-full flex flex-col justify-between rounded-3xl shadow-sm">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors text-muted-foreground">
                                                <Layers size={18} />
                                            </div>
                                            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest text-muted-foreground">{cls.grade_level}</span>
                                        </div>

                                        <h3 className="text-2xl font-black mb-1 group-hover:text-primary transition-colors text-card-foreground">
                                            {cls.name}
                                        </h3>
                                        <p className="text-xs opacity-40 font-bold text-muted-foreground">{cls.gender === 'boy' ? 'بنين' : cls.gender === 'girl' ? 'بنات' : 'مشترك'}</p>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity text-foreground">
                                            <CalendarClock size={14} />
                                            <span>عرض الجدول</span>
                                        </div>
                                        <ChevronLeft size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
