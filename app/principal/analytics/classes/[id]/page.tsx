"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    Cell
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, ShieldAlert, UserCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useClassAnalytics } from "../../_hooks/useClassAnalytics";
import { AnalyticsCard } from "../../_components/AnalyticsCard";

export default function ClassCockpit() {
    const { id } = useParams();
    const { stats, loading, className } = useClassAnalytics(id as string);

    if (loading || !stats) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[hsla(var(--gold),.25)] border-t-[hsl(var(--gold))] rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري تحليل &quot;شخصية&quot; الفصل...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[hsla(var(--gold),.05)] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/principal"
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-stone-200"
                            >
                                <ArrowLeft className="w-5 h-5 text-stone-500 rotate-180" />
                            </Link>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-stone-950 to-stone-500 bg-clip-text text-transparent">
                                كبينة تحليل الفصل: {className}
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            رصد حيوية الفصل، توافق المعلمين، والطلاب المؤثرين
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md text-xs text-stone-500">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-[hsl(var(--gold))] rounded-full animate-pulse" />
                            تحليل ذكي للسلوك والتحصيل
                        </div>
                    </div>
                </header>

                {/* Pulse Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <AnalyticsCard title="نبض الانضباط" subtitle="مؤشر الهدوء مقارنة بمستوى الغياب والمخالفات">
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="relative w-40 h-20 overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e7e5e4" strokeWidth="8" strokeLinecap="round" />
                                    <path
                                        d="M 10 50 A 40 40 0 0 1 90 50"
                                        fill="none" stroke="hsl(var(--gold))" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray="126"
                                        strokeDashoffset={126 - (126 * (stats.disciplineScore / 100))}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-x-0 bottom-0 text-center font-black text-3xl">%{stats.disciplineScore}</div>
                            </div>
                            <p className="mt-4 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                                {stats.disciplineScore > 90 ? 'انضباط مثالي' : (stats.disciplineScore > 70 ? 'وضع مستقر' : 'تنبيه: يحتاج تدخل')}
                            </p>
                        </div>
                    </AnalyticsCard>

                    <AnalyticsCard title="مستوى التحصيل الدراسي" subtitle="متوسط درجات الفصل في الاختبارات الأخيرة">
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="relative w-40 h-20 overflow-hidden">
                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e7e5e4" strokeWidth="8" strokeLinecap="round" />
                                    <path
                                        d="M 10 50 A 40 40 0 0 1 90 50"
                                        fill="none" stroke="#6366f1" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray="126"
                                        strokeDashoffset={126 - (126 * (stats.academicScore / 100))}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-x-0 bottom-0 text-center font-black text-3xl">%{stats.academicScore}</div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] text-stone-500 font-bold uppercase">+%٣.٤ مقارنة بالشهر السابق</span>
                            </div>
                        </div>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Behavior Heatmap */}
                    <AnalyticsCard title="خريطة السلوك الزمني" subtitle="متى يكثر الشغب؟ توزيع المخالفات حسب الحصص" className="lg:col-span-2">
                        <div className="grid grid-cols-8 gap-1 h-[280px]">
                            <div className="col-span-1" />
                            {[1, 2, 3, 4, 5, 6, 7].map(p => <div key={p} className="text-center text-[9px] font-black text-stone-500">ح{p}</div>)}

                            {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map(day => (
                                <React.Fragment key={day}>
                                    <div className="text-[9px] font-bold text-stone-500 flex items-center">{day}</div>
                                    {[1, 2, 3, 4, 5, 6, 7].map(p => {
                                        const cell = stats.behaviorHeatmap.find(h => h.day === day && h.period === p);
                                        const opacity = cell ? Math.min(cell.count * 0.3, 0.9) : 0.1;
                                        return (
                                            <div
                                                key={p}
                                                className="aspect-[2/1] bg-rose-500 rounded border border-stone-200 transition-all"
                                                {...{ style: { opacity } as React.CSSProperties }}
                                                title={`الحصة ${p} - ${day}: ${cell?.count} مخالفة`}
                                            />
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end gap-4 text-[9px] text-stone-500 font-black">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500/10 rounded" /> هادئ</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500/50 rounded" /> متوسط</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded" /> صاخب</span>
                        </div>
                    </AnalyticsCard>

                    {/* Teacher Compatibility */}
                    <AnalyticsCard title="تحليل توافق المعلمين" subtitle="العلاقة بين المعلم وسلوك الفصل">
                        <div className="space-y-6 pt-4">
                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 group hover:bg-emerald-500/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <UserCheck className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-black tracking-widest">أفضل توافق (Hero)</span>
                                </div>
                                <h4 className="text-sm font-bold text-stone-800">{stats.heroTeacher}</h4>
                                <p className="text-[9px] text-emerald-500/70 mt-1 italic">أقل نسبة مخالفات وأفضل تفاعل طلابي مع هذا المعلم.</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 group hover:bg-rose-500/10 transition-all">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <span className="text-[10px] text-rose-400 font-black tracking-widest">يحتاج مراجعة</span>
                                </div>
                                <h4 className="text-sm font-bold text-stone-800">{stats.needsImprovementTeacher}</h4>
                                <p className="text-[9px] text-rose-500/70 mt-1 italic">احتمالية وجود تحديات في إدارة الصف أو انضباط الحضور.</p>
                            </div>
                        </div>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Mass Attendance Log */}
                    <AnalyticsCard title="رادار الغياب الجماعي" subtitle="رصد حالات الغياب التي تتجاوز %١٥ من الفصل">
                        <ChartContainer height={250} className="pt-4">
                            <BarChart data={stats.massAttendance}>
                                <XAxis dataKey="date" stroke="#78716c" fontSize={10} hide />
                                <YAxis stroke="#78716c" fontSize={10} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[10, 10, 0, 0]}>
                                    {stats.massAttendance.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.count > 10 ? '#f43f5e' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                        <div className="mt-4 space-y-2">
                            {stats.massAttendance.slice(0, 2).map((ma, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 text-[10px]">
                                    <span className="text-stone-500">{ma.date}</span>
                                    <span className={`font-black ${ma.count > 10 ? 'text-rose-400' : 'text-blue-400'}`}>{ma.count} طلاب غائبين</span>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    {/* Influential Students */}
                    <AnalyticsCard title="منظومة التأثير الطلابي" subtitle="الطلاب الـ ٥ الأكثر تأثيراً في مناخ الفصل">
                        <div className="space-y-4 pt-2">
                            {stats.influentialStudents.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-stone-200 group hover:bg-stone-100/80 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${s.type === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                            {s.type === 'positive' ? '+' : '-'}
                                        </div>
                                        <span className="text-xs font-bold">{s.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] font-black text-stone-500 uppercase">{s.type === 'positive' ? 'محفز للطاقة' : 'بؤرة توتر'}</div>
                                        <div className={`text-[10px] font-mono ${s.type === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>{s.score} نقطة تأثير</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>
                </div>
            </div>
        </main>
    );
}
