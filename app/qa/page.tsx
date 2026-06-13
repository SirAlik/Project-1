"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQA } from "./_hooks/useQA";
import { KPICard } from "@/components/ui/KPICard";
import { ObservationList } from "./_components/ObservationList";
import { DisciplineKnightsModal } from "@/components/operations/DisciplineKnightsModal";
import { Trophy, ChevronLeft, BarChart3, ShieldCheck, Activity } from "lucide-react";
import { AIInsightCard } from "@/components/ai/AIInsightCard";

export default function QADashboard() {
    const { state } = useQA();
    const [isKnightsOpen, setIsKnightsOpen] = useState(false);

    // Derived Stats
    const totalObs = state.observations.length;
    const avgScore = totalObs > 0
        ? (state.observations.reduce((a, b) => a + b.overall_score, 0) / totalObs).toFixed(1)
        : "0";
    const highRiskStudents = state.risks.filter(r => r.risk_level === 'high').length;
    const latestAttendanceRate = state.kpis.at(-1)?.metrics.attendance_rate;
    const attendanceValue = typeof latestAttendanceRate === "number"
        ? `${latestAttendanceRate.toFixed(1)}%`
        : "لا توجد بيانات";

    return (
        <>
            <main className="text-[var(--text)] font-sans pb-20" dir="rtl">
                <div className="relative z-10">
                    <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">
                                ضمان <span className="text-sky-500">الجودة</span>
                            </h1>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => setIsKnightsOpen(true)}
                                className="glass-card px-5 py-2.5 rounded-2xl text-xs font-bold text-[hsl(var(--accent-primary))] hover:bg-[hsla(var(--accent-primary),.05)] transition-all border-[hsla(var(--accent-primary),.20)] flex items-center gap-2"
                            >
                                <Trophy className="w-4 h-4 shadow-pulse" /> فرسان الانضباط
                            </button>

                            <Link href="/qa/corrective-action" className="bg-emerald-700/80 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/10 transition-all flex items-center gap-2">
                                الإجراءات التصحيحية <ChevronLeft className="w-4 h-4" />
                            </Link>
                            <Link href="/qa/corrective-action/new" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2">
                                إجراء تصحيحي جديد <ChevronLeft className="w-4 h-4" />
                            </Link>

                        </div>
                    </header>

                    {state.msg && (
                        <div className="mb-8 p-4 glass-panel border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4">
                            {state.msg}
                        </div>
                    )}

                    {/* KPI Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <KPICard title="متوسط الأداء التعليمي" value={`${avgScore}%`} trend="up" color="primary" icon={BarChart3} />
                        <KPICard title="الزيارات الصفية" value={totalObs} color="primary" icon={Activity} />
                        <KPICard title="مؤشر الخطر (طلاب)" value={highRiskStudents} trend="down" color="rose" icon={ShieldCheck} />
                        <KPICard title="نسبة الحضور (اليوم)" value={attendanceValue} trend={typeof latestAttendanceRate === "number" ? "up" : undefined} color="accent" icon={Trophy} />
                    </div>

                    {/* AI Insight */}
                    <div className="mb-10">
                        <AIInsightCard contextType="quality_summary" title="الرؤية الذكية — ضمان الجودة" />
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Weekly Trends Chart Area */}
                        <div className="lg:col-span-8">
                            <section className="glass-card p-10 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-lg font-bold">اتجاهات الحضور الأسبوعية</h3>
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-sky-500"></div>
                                        <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">معدل الحضور</span>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-end gap-3 px-4">
                                    {state.kpis.slice(-7).map((k, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center group">
                                            <div className="w-full bg-gradient-to-t from-sky-600/20 to-sky-400/40 group-hover:from-sky-500/40 group-hover:to-sky-400 group-hover:scale-x-105 rounded-2xl relative transition-all duration-500 flex items-end justify-center pb-4 qa-bar"
                                                data-h={k.metrics.attendance_rate}>
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass-panel px-2.5 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all pointer-events-none border whitespace-nowrap shadow-xl">
                                                    {(k.metrics.attendance_rate as number).toFixed(1)}%
                                                </div>
                                                <span className="text-[10px] font-black text-stone-400 group-hover:text-foreground transition-colors rotate-90 origin-bottom mb-2">{k.date.split('-').slice(1).join('/')}</span>
                                            </div>
                                            <div className="mt-4 text-[9px] font-bold opacity-20 uppercase tracking-widest">{new Date(k.date).toLocaleDateString('ar-EG', { weekday: 'short' })}</div>
                                        </div>
                                    ))}
                                    {state.kpis.length === 0 && (
                                        <div className="w-full flex flex-col items-center justify-center opacity-10">
                                            <BarChart3 className="w-16 h-16 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">لا توجد بيانات متاحة حالياً</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="lg:col-span-4">
                            <article className="h-full">
                                <ObservationList observations={state.observations} />
                            </article>
                        </div>
                    </div>
                </div>
            </main>
            <DisciplineKnightsModal
                isOpen={isKnightsOpen}
                onClose={() => setIsKnightsOpen(false)}
                userRole="school_admin"
            />
        </>
    );
}
