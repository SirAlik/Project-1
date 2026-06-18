"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, GraduationCap, Layers, Radio } from "lucide-react";
import { supabase } from "@/lib/db/supabase";
import { GlassSkeleton } from "@/components/ui/GlassSkeleton";
import { RoleDashboardShell } from "@/components/layout/RoleDashboardShell";
import { PageHeader, DashboardGrid, ActionCard, EmptyState } from "@/components/dashboard";

export default function ClassroomSelectionPage() {
    interface TeacherClass { id: string; name: string; }
    interface TeacherSubject { name_ar: string; }
    interface TeacherAssignment { id: string; classes: TeacherClass; subjects: TeacherSubject; }
    interface LiveClassSlot { classes: TeacherClass; subjects: TeacherSubject; }

    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [liveClass, setLiveClass] = useState<LiveClassSlot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTeacherData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Assignments
            const { data: assignData } = await supabase
                .from('teacher_assignments')
                .select('*, classes(*), subjects(*)')
                .eq('teacher_id', user.id);

            setAssignments(assignData || []);

            // 2. Live Class Logic — من الجدول الدراسي بناءً على start_time / end_time
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const { data: todaySlots } = await supabase
                .from('timetable_slots')
                .select('*, classes(*), subjects(*), period: periods(id, number, start_time, end_time)')
                .eq('teacher_id', user.id)
                .eq('day', currentDay);

            const liveSlot = (todaySlots ?? []).find((s: { period: unknown }) => {
                const p = s.period as { start_time: string; end_time: string } | null;
                return p?.start_time && p?.end_time &&
                    p.start_time <= currentTime && p.end_time > currentTime;
            }) ?? null;

            if (liveSlot) setLiveClass(liveSlot);

            setLoading(false);
        }
        fetchTeacherData();
    }, []);

    if (loading) return (
        <RoleDashboardShell role="teacher">
            <div className="space-y-8">
                <GlassSkeleton className="h-32 rounded-2xl" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <GlassSkeleton key={i} className="h-36 rounded-2xl" />)}
                </div>
            </div>
        </RoleDashboardShell>
    );

    return (
        <RoleDashboardShell role="teacher">
            <div className="space-y-8" dir="rtl">
                <PageHeader
                    icon={GraduationCap}
                    align="center"
                    title="بوابة المعلم"
                    subtitle="التحكم الصفي والمزامنة الفورية مع الجدول الدراسي."
                />

                {/* حصّة مباشرة الآن */}
                {liveClass && (
                    <div className="flex justify-center">
                        <Link
                            href={`/classroom/${liveClass.classes.id}`}
                            className="group flex items-center gap-5 rounded-2xl border border-primary/30 bg-primary/5 px-6 py-3 transition-colors hover:border-primary/50"
                        >
                            <span className="flex items-center gap-2">
                                <Radio size={16} className="text-destructive" />
                                <span className="text-[10px] font-black uppercase tracking-tight text-destructive">حصّة مباشرة الآن</span>
                            </span>
                            <span className="h-6 w-px bg-border" />
                            <span className="flex items-center gap-3">
                                <span className="text-sm font-black text-foreground">{liveClass.classes.name}</span>
                                <span className="text-xs text-muted-foreground">|</span>
                                <span className="text-xs font-bold text-primary">{liveClass.subjects.name_ar}</span>
                            </span>
                            <ChevronLeft size={16} className="text-muted-foreground transition-colors group-hover:text-primary" />
                        </Link>
                    </div>
                )}

                <section className="space-y-4">
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                        <Layers className="h-4 w-4 text-primary" /> فصولك الدراسية
                    </h2>

                    {assignments.length === 0 ? (
                        <EmptyState
                            icon={Layers}
                            title="لا توجد فصول مُسندة"
                            hint="لم يتم تعيين أي فصول لك بعد في الجدول الدراسي."
                        />
                    ) : (
                        <DashboardGrid cols={3}>
                            {assignments.map((assign) => (
                                <ActionCard
                                    key={assign.id}
                                    href={`/classroom/${assign.classes.id}`}
                                    icon={Layers}
                                    title={assign.classes.name}
                                    description={assign.subjects.name_ar}
                                />
                            ))}
                        </DashboardGrid>
                    )}
                </section>
            </div>
        </RoleDashboardShell>
    );
}
