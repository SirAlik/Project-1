"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    Legend, Cell, ScatterChart, Scatter
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useTeacherAnalytics } from "../_hooks/useTeacherAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function TeacherArena() {
    const { stats, loading } = useTeacherAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-medium animate-pulse">جاري فحص مؤشرات الأداء للمعلمين...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/principal"
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-white/5"
                            >
                                <ArrowLeft className="w-5 h-5 text-zinc-400 rotate-180" />
                            </Link>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                                ساحة أداء المعلمين (The Arena)
                            </h1>
                        </div>
                        <p className="text-zinc-500 mr-12 text-sm italic">
                            المقارنة الجماعية لمؤشرات الكفاءة، انضباط الحضور، واكتمال المنهج
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            تحليل متقدم لأداء الهيئة التدريسية
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    {/* Top Teachers Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <AnalyticsCard title="رواد الأداء" subtitle="الأعلى تقييماً هذا الشهر">
                            <div className="space-y-4">
                                {stats.teacherList.slice(0, 5).map((t, i) => (
                                    <Link key={t.id} href={`/principal/analytics/teachers/${t.id}`}>
                                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group mb-3 last:mb-0">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 text-[10px] font-black group-hover:bg-indigo-500 group-hover:text-black transition-colors">
                                                #{i + 1}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-xs font-bold truncate">{t.name}</p>
                                                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${t.avgScore}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-indigo-400">%{t.avgScore}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </AnalyticsCard>
                    </div>

                    {/* Performance Ranking Chart */}
                    <div className="lg:col-span-3">
                        <AnalyticsCard title="مؤشر الكفاءة العام" subtitle="ترتيب المعلمين بناءً على (التقييم، الحضور، إنجاز المنهج)">
                            <ChartContainer height={400} className="pt-4">
                                    <BarChart data={stats.teacherList.slice(0, 10)}>
                                        <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tick={{ fill: '#9ca3af' }} />
                                        <YAxis stroke="#4b5563" fontSize={10} domain={[60, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem', color: '#fff' }}
                                        />
                                        <Legend />
                                        <Bar name="درجة التقييم" dataKey="avgScore" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                                        <Bar name="إنجاز المنهج" dataKey="curriculumProgress" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ChartContainer>
                        </AnalyticsCard>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Grade Distribution Map */}
                    <AnalyticsCard title="خريطة توزيع الدرجات" subtitle="تحليل ميول المعلمين (متساهل vs متشدد)">
                        <ChartContainer height={300}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <XAxis type="category" dataKey="name" name="المعلم" stroke="#4b5563" fontSize={10} hide />
                                <YAxis type="number" dataKey="score" name="متوسط الدرجات" stroke="#4b5563" fontSize={10} domain={[60, 100]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem', color: '#fff' }}
                                />
                                <Scatter name="المعلمين" data={stats.gradeDistribution}>
                                    {stats.gradeDistribution.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.type === 'easy' ? 'var(--primary)' : (entry.type === 'strict' ? '#f43f5e' : 'var(--accent)')}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ChartContainer>
                        <div className="flex justify-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-[10px] text-rose-400">
                                <div className="w-2 h-2 rounded-full bg-rose-500" /> متشدد
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-indigo-400">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" /> معتدل
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" /> متساهل
                            </div>
                        </div>
                    </AnalyticsCard>

                    {/* Period Heatmap */}
                    <AnalyticsCard title="رادار المتابعة الميدانية" subtitle="خريطة إشغال الحصص وفرص الانتظار">
                        <div className="grid grid-cols-8 gap-1.5 h-full content-start">
                            <div className="col-span-1" />
                            {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                <div key={p} className="text-center text-[9px] font-black text-zinc-500">ح{p}</div>
                            ))}

                            {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map(day => (
                                <React.Fragment key={day}>
                                    <div className="text-[9px] font-bold text-zinc-500 flex items-center">{day}</div>
                                    {[1, 2, 3, 4, 5, 6, 7].map(p => {
                                        const cell = stats.heatMap.find(h => h.day === day && h.period === p);
                                        return (
                                            <div
                                                key={p}
                                                className={`aspect-square rounded-md border border-white/5 transition-all
                                                ${cell?.status === 'free' ? 'bg-emerald-500/20 border-emerald-500/30' :
                                                        cell?.status === 'sub' ? 'bg-[hsla(var(--gold),.20)] border-[hsla(var(--gold),.30)] animate-pulse' :
                                                            'bg-zinc-800/40'}`}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-between items-center text-[9px] text-zinc-500 uppercase font-black">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500/20 rounded-sm" /> متاح</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-[hsla(var(--gold),.20)] rounded-sm" /> انتظار</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-800/40 rounded-sm" /> مشغول</span>
                            </div>
                            <Link href="/classroom" className="text-indigo-400 hover:text-indigo-300">فتح الجدول الكامل ←</Link>
                        </div>
                    </AnalyticsCard>
                </div>
            </div>
        </main>
    );
}
