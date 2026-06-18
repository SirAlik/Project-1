"use client";

import { useState } from "react";
import Link from "next/link";
import { useQA } from "./_hooks/useQA";
import { ObservationList } from "./_components/ObservationList";
import { DisciplineKnightsModal } from "@/components/operations/DisciplineKnightsModal";
import { Trophy, ArrowLeft, BarChart3, ShieldCheck, Activity, Plus } from "lucide-react";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import { PageHeader, DashboardGrid, MetricCard, DashboardSection, EmptyState } from "@/components/dashboard";

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
            <div className="space-y-8" dir="rtl">
                <PageHeader
                    icon={ShieldCheck}
                    title="ضمان الجودة"
                    subtitle="الملاحظات الصفّية ومؤشّرات الأداء والإجراءات التصحيحية."
                    actions={
                        <>
                            <button
                                onClick={() => setIsKnightsOpen(true)}
                                className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                <Trophy className="h-4 w-4 text-primary" /> فرسان الانضباط
                            </button>
                            <Link
                                href="/qa/corrective-action"
                                className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                الإجراءات التصحيحية <ArrowLeft className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/qa/corrective-action/new"
                                className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" /> إجراء تصحيحي جديد
                            </Link>
                        </>
                    }
                />

                {state.msg && (
                    <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-bold text-success">
                        {state.msg}
                    </div>
                )}

                {/* KPI Strip */}
                <DashboardGrid cols={4}>
                    <MetricCard label="متوسط الأداء التعليمي" value={`${avgScore}%`} icon={BarChart3} tone="primary" />
                    <MetricCard label="الزيارات الصفية" value={totalObs} icon={Activity} tone="info" />
                    <MetricCard label="مؤشر الخطر (طلاب)" value={highRiskStudents} icon={ShieldCheck} tone="danger" />
                    <MetricCard label="نسبة الحضور (اليوم)" value={attendanceValue} icon={Trophy} tone="success" />
                </DashboardGrid>

                {/* AI Insight */}
                <AIInsightCard contextType="quality_summary" title="الرؤية الذكية — ضمان الجودة" />

                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Weekly Trends Chart Area */}
                    <div className="lg:col-span-8">
                        <DashboardSection
                            title="اتجاهات الحضور الأسبوعية"
                            icon={BarChart3}
                            action={
                                <span className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">معدل الحضور</span>
                                </span>
                            }
                            className="h-full"
                        >
                            {state.kpis.length === 0 ? (
                                <EmptyState icon={BarChart3} title="لا توجد بيانات متاحة حالياً" hint="ستظهر اتجاهات الحضور بعد توفّر مؤشّرات يومية." />
                            ) : (
                                <div className="flex flex-1 items-end gap-3 px-2 pt-6">
                                    {state.kpis.slice(-7).map((k, i) => (
                                        <div key={i} className="group flex flex-1 flex-col items-center">
                                            <div
                                                className="qa-bar relative flex w-full items-end justify-center rounded-2xl bg-gradient-to-t from-primary/15 to-primary/40 pb-4 transition-all duration-500 group-hover:from-primary/30 group-hover:to-primary"
                                                data-h={k.metrics.attendance_rate}
                                            >
                                                <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-border bg-card px-2.5 py-1.5 text-[10px] font-black text-foreground opacity-0 shadow-sm transition-all group-hover:opacity-100">
                                                    {(k.metrics.attendance_rate as number).toFixed(1)}%
                                                </div>
                                                <span className="mb-2 origin-bottom rotate-90 text-[10px] font-black text-muted-foreground transition-colors group-hover:text-foreground">
                                                    {k.date.split('-').slice(1).join('/')}
                                                </span>
                                            </div>
                                            <div className="mt-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                                {new Date(k.date).toLocaleDateString('ar-EG', { weekday: 'short' })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardSection>
                    </div>

                    <div className="lg:col-span-4">
                        <ObservationList observations={state.observations} />
                    </div>
                </div>
            </div>
            <DisciplineKnightsModal
                isOpen={isKnightsOpen}
                onClose={() => setIsKnightsOpen(false)}
                userRole="school_admin"
            />
        </>
    );
}
