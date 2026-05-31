"use client";

import React from "react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, Tooltip,
    AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, User, ShieldCheck, Zap, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useTeacherAnalytics } from "../../_hooks/useTeacherAnalytics";
import { AnalyticsCard } from "../../_components/AnalyticsCard";

export default function TeacherDeepDive() {
    const { stats, loading } = useTeacherAnalytics();

    if (loading || !stats.individual) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-zinc-500 font-medium animate-pulse">جاري تشريح بيانات المعلم...</p>
                </div>
            </div>
        );
    }

    const teacher = stats.individual;

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/principal/analytics/teachers"
                                className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-white/5"
                            >
                                <ArrowLeft className="w-5 h-5 text-zinc-400 rotate-180" />
                            </Link>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                                ملف الكفاءة الفردي (Deep Dive)
                            </h1>
                        </div>
                        <p className="text-zinc-500 mr-12 text-sm italic">
                            تحليل تفصيلي لأداء المعلم: {teacher.name}
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <ShieldCheck className="w-4 h-4 text-violet-400" />
                            بروفايل معتمد تقنياً
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Basic Info & Radar */}
                    <div className="lg:col-span-4 space-y-6">
                        <AnalyticsCard title="رادار الكفاءة" subtitle="تقييم سداسي للمهارات الأساسية">
                            <ChartContainer height={300} className="pt-4">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={teacher.radarData}>
                                        <PolarGrid stroke="#1f2937" />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                                        <Radar
                                            name={teacher.name}
                                            dataKey="score"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.6}
                                        />
                                    </RadarChart>
                                </ChartContainer>
                        </AnalyticsCard>

                        <AnalyticsCard title="مؤشر رضا الطلاب" subtitle="بناءً على استطلاعات الرأي المباشرة">
                            <div className="flex flex-col items-center justify-center py-6">
                                <div className="text-5xl font-black text-white mb-2">{teacher.studentSatisfaction}</div>
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Zap key={s} className={`w-4 h-4 ${s <= 4 ? 'text-[hsl(var(--gold))] fill-[hsl(var(--gold))]' : 'text-zinc-800'}`} />
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-500 text-center uppercase font-black">تقييم ممتاز</p>
                            </div>
                        </AnalyticsCard>
                    </div>

                    {/* Right Column: Progress & History */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Curriculum Progress */}
                            <AnalyticsCard title="خط سير المنهج" subtitle="توافق الأداء الفعلي مع الخطة الزمنية">
                                <div className="space-y-6 py-4">
                                    {teacher.curriculumDetails.map((c, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="font-bold text-zinc-300">{c.subject}</span>
                                                <span className="text-violet-400 font-mono">%{c.progress}</span>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${c.progress}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-zinc-500 italic">ملاحظة: البيانات تتوافق مع الخطط المسجلة في Classroom.</p>
                                </div>
                            </AnalyticsCard>

                            {/* Visit Evolution */}
                            <AnalyticsCard title="تطور التقييم الميداني" subtitle="نتائج الزيارات الصفية خلال الفصل">
                                <ChartContainer height={200} className="pt-4">
                                        <AreaChart data={teacher.visitHistory}>
                                            <defs>
                                                <linearGradient id="colorVisit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#4b5563" fontSize={10} hide />
                                            <YAxis domain={[0, 100]} hide />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem', color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="score" stroke="var(--primary)" fillOpacity={1} fill="url(#colorVisit)" />
                                        </AreaChart>
                                    </ChartContainer>
                                <div className="mt-4 flex justify-between items-center px-2">
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase">آخر تقييم</p>
                                        <p className="text-lg font-black text-emerald-400">%{teacher.visitHistory[teacher.visitHistory.length - 1]?.score || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-zinc-500 uppercase">التحسن</p>
                                        <p className="text-lg font-black text-indigo-400">+%١٢</p>
                                    </div>
                                </div>
                            </AnalyticsCard>
                        </div>

                        {/* Recent Actions/Log for this teacher */}
                        <AnalyticsCard title="سجل الأحداث التعليمية" subtitle="آخر الأنشطة والتعاميم المرتبطة">
                            <div className="space-y-3">
                                {[
                                    { icon: BookOpen, text: 'تم تحديث خطة الدرس للفصل "٤/أ"', time: 'منذ يومين' },
                                    { icon: GraduationCap, text: 'حضور دورة التدريب على التقنيات الحديثة', time: 'منذ أسبوع' },
                                    { icon: User, text: 'استلام تعميم رقم (٤٠٢) بشأن الاختبارات', time: 'منذ ٣ ساعات' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-violet-500/5 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                                                <item.icon className="w-5 h-5 text-zinc-400" />
                                            </div>
                                            <p className="text-xs font-medium text-zinc-200">{item.text}</p>
                                        </div>
                                        <span className="text-[10px] text-zinc-500">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </AnalyticsCard>
                    </div>
                </div>
            </div>
        </main>
    );
}
