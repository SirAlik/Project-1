"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, GraduationCap, Layers, Radio } from "lucide-react";
import { supabase } from "@/lib/db/supabase";
import { GlassSkeleton } from "@/components/ui/GlassSkeleton";

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
    <div className="p-12 space-y-12">
      <GlassSkeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <GlassSkeleton key={i} className="h-48 rounded-3xl" />)}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen text-foreground p-12" dir="rtl">
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 mb-8 blur-in">
            <GraduationCap className="text-primary w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-4 text-primary">
            بوابة المعلم
          </h1>
          <p className="opacity-60 text-sm uppercase tracking-widest font-black text-muted-foreground">التحكم الصفي • المزامنة الفورية</p>

          {/* Live Banner */}
          {liveClass && (
            <div className="mt-8 flex justify-center">
              <Link href={`/classroom/${liveClass.classes.id}`}>
                <div className="bg-card p-4 px-8 rounded-full border border-primary/30 flex items-center gap-6 animate-pulse group hover:scale-105 transition-all shadow-lg hover:shadow-primary/20">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className="text-destructive" />
                    <span className="text-[10px] font-black text-destructive uppercase tracking-tighter">حصّة مباشرة الآن</span>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black italic text-foreground">{liveClass.classes.name}</span>
                    <span className="text-xs text-muted-foreground">|</span>
                    <span className="text-xs font-bold text-primary">{liveClass.subjects.name_ar}</span>
                  </div>
                  <ChevronLeft size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          )}
        </header>

        <div className="space-y-12">
          <h2 className="text-sm font-black uppercase tracking-widest opacity-40 flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" /> فصولك الدراسية
          </h2>

          {assignments.length === 0 ? (
            <div className="bg-card p-20 text-center border-dashed border-border opacity-50 rounded-3xl">
              <p className="text-sm text-muted-foreground">لم يتم تعيين أي فصول لك بعد في الجدول الدراسي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assign) => (
                <Link key={assign.id} href={`/classroom/${assign.classes.id}`}>
                  <div className="bg-card p-10 hover:border-primary/50 hover:bg-muted/5 transition-all cursor-pointer group text-right relative overflow-hidden rounded-[2rem] border border-border shadow-sm">
                    <span className="text-4xl font-black text-primary opacity-20 group-hover:opacity-100 transition-all italic">
                      {assign.classes.name}
                    </span>
                    <div className="mt-2 text-sm font-black text-foreground">{assign.subjects.name_ar}</div>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-[9px] font-black opacity-40 uppercase tracking-widest group-hover:text-primary text-muted-foreground">دخول الفصل</div>
                      <ChevronLeft size={14} className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all text-primary" />
                    </div>
                    <div className="absolute inset-x-[-100%] top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent group-hover:left-full transition-all duration-1000" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

