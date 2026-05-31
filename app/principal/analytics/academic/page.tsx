"use client";

import React from "react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip,
    AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, BookOpen, GraduationCap, Award, TrendingUp, Presentation } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useAcademicAnalytics } from "../_hooks/useAcademicAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function AcademicAnalytics() {
    const { stats, loading } = useAcademicAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium animate-pulse">جاري جلب البيانات الأكاديمية...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/principal"
                                className="p-2 hover:bg-muted/50 rounded-xl transition-colors border border-border"
                            >
                                <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                            </Link>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                                الرصد الأكاديمي: وكيل الشؤون التعليمية
                            </h1>
                        </div>
                        <p className="text-muted-foreground mr-12 text-sm italic">
                            متابعة نبض المنهج، أداء الهيئة التدريسية، ومنحنى التحصيل
                        </p>
                    </div>

                    <div className="bg-card/50 border border-border px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            تغطية شاملة للمنهج الدراسي
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'استقرار الحصص', value: `%${stats.lessonStability}`, icon: Presentation, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                        { label: 'خطط معلقة', value: stats.pendingPlans, icon: BookOpen, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsla(var(--gold),.15)]', border: 'border-[hsla(var(--gold),.25)]' },
                        { label: 'متوسط الدرجات', value: `%${stats.gradeTrend[stats.gradeTrend.length - 1]?.average || 0}`, icon: TrendingUp, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
                        { label: 'عدد المعلمين', value: stats.totalTeachers, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-[2rem] bg-card border ${item.border} backdrop-blur-xl relative overflow-hidden group shadow-sm`}
                        >
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <item.icon className="w-16 h-16" />
                            </div>
                            <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">{item.label}</p>
                            <h2 className="text-3xl font-black text-card-foreground">{item.value}</h2>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Curriculum Completion */}
                    <AnalyticsCard
                        title="إنجاز المناهج الدراسية"
                        subtitle="نسبة ما تم قطعه فعلياً مقارنة بالخطة"
                        className="lg:col-span-2"
                    >
                        <div className="space-y-6 py-4">
                            {stats.curriculumCompletion.map((item, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-muted-foreground">{item.subject}</span>
                                        <span className="text-emerald-500">%{item.progress}</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden border border-border">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.progress}%` }}
                                            transition={{ duration: 1, delay: i * 0.1 }}
                                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    {/* Teacher Radar */}
                    <AnalyticsCard title="توازن كفاءة التعليم" subtitle="متوسط أداء الهيئة التدريسية">
                        <ChartContainer height={300} className="ltr">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.teacherPerformance}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="الأداء"
                                    dataKey="score"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.4}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '1rem', color: 'hsl(var(--popover-foreground))' }}
                                />
                            </RadarChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Grade Trends */}
                    <AnalyticsCard title="منحنى التحصيل الدراسي" subtitle="متوسط درجات الطلاب خلال الفصل">
                        <ChartContainer height={250} className="ltr">
                            <AreaChart data={stats.gradeTrend}>
                                <defs>
                                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '1rem', color: 'hsl(var(--popover-foreground))' }}
                                />
                                <Area type="monotone" dataKey="average" name="المتوسط" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAvg)" />
                            </AreaChart>
                        </ChartContainer>
                    </AnalyticsCard>

                    {/* Top Classes Ranking */}
                    <AnalyticsCard title="الفصول الأعلى تميزاً" subtitle="بناءً على نتائج الاختبارات الأخيرة">
                        <div className="space-y-4">
                            {stats.topClasses.map((cls, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-muted/30 border border-border group hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[hsla(var(--gold),.15)] flex items-center justify-center border border-[hsla(var(--gold),.25)]">
                                            <Award className="w-5 h-5 text-[hsl(var(--gold))]" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">فصل {cls.name}</p>
                                            <p className="text-[10px] text-muted-foreground">أداء أكاديمي متفوق</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-foreground">%{cls.avg}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold">+2.4%</p>
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
