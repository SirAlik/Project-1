"use client";

import React from "react";
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis,
    Tooltip, Cell,
    AreaChart, Area, CartesianGrid
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Rocket, Calendar, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useActivityAnalytics } from "../_hooks/useActivityAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function ActivityAnalytics() {
    const { stats, loading } = useActivityAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[hsla(var(--accent-primary),.25)] border-t-[hsl(var(--accent-primary))] rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب بيانات النشاط...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[hsla(var(--accent-primary),.05)] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
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
                                رادار النشاط الطلابي
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            قياس حيوية المدرسة، تفاعل الأندية، والجدول الزمني للفعاليات
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-[hsl(var(--accent-primary))] rounded-full animate-pulse" />
                            رصد حي لمعدلات التفاعل اللاصفي
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'نسبة التفاعل', value: `%${stats.participationRate}`, icon: TrendingUp, color: 'text-[hsl(var(--accent-primary))]', bg: 'bg-[hsla(var(--accent-primary),.15)]', border: 'border-[hsla(var(--accent-primary),.25)]' },
                        { label: 'الأندية النشطة', value: stats.activeClubs, icon: Star, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
                        { label: 'إجمالي الفعاليات', value: stats.totalEvents, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'فعاليات قادمة', value: stats.upcomingEvents, icon: Rocket, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-[2rem] bg-white/80 border ${item.border} backdrop-blur-xl relative overflow-hidden group`}
                        >
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <item.icon className="w-16 h-16" />
                            </div>
                            <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</p>
                            <h2 className="text-3xl font-black text-foreground">{item.value}</h2>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Participation Gauge */}
                    <AnalyticsCard title="مؤشر حيوية المدرسة" subtitle="نسبة مشاركة الطلاب في الأنشطة مقارنة بالإجمالي">
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="relative w-48 h-24 overflow-hidden">
                                {/* Semi-circle Gauge */}
                                <svg className="w-full h-full" viewBox="0 0 100 50">
                                    <path
                                        d="M 10 50 A 40 40 0 0 1 90 50"
                                        fill="none" stroke="#e7e5e4" strokeWidth="8" strokeLinecap="round"
                                    />
                                    <path
                                        d="M 10 50 A 40 40 0 0 1 90 50"
                                        fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray="126"
                                        strokeDashoffset={126 - (126 * (stats.participationRate / 100))}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                                    <span className="text-3xl font-black text-foreground">%{stats.participationRate}</span>
                                    <span className="text-[10px] text-stone-500 font-bold">تفاعل مرتفع</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-stone-500 text-center leading-relaxed">
                                يعتمد المؤشر على عدد الطلاب <br /> المسجلين في نادٍ واحد على الأقل.
                            </p>
                        </div>
                    </AnalyticsCard>

                    {/* Club Popularity Bubble Chart */}
                    <AnalyticsCard
                        title="خارطة الأندية الطلابية"
                        subtitle="توزيع الشعبية مقابل عدد الأعضاء"
                        className="lg:col-span-2"
                    >
                        <ChartContainer height={300}>
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <XAxis type="category" dataKey="name" name="النادي" stroke="#78716c" fontSize={10} interval={0} />
                                <YAxis type="number" dataKey="members" name="الأعضاء" stroke="#78716c" fontSize={10} hide />
                                <ZAxis type="number" dataKey="value" range={[50, 400]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Scatter name="الأندية" data={stats.clubPopularity} fill="#6366f1">
                                    {stats.clubPopularity.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#6366f1'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Event Timeline */}
                    <AnalyticsCard title="سجل الفعاليات" subtitle="الخط الزمني للنشاط المدرسي">
                        <div className="space-y-6 relative before:absolute before:inset-y-0 before:right-[1.45rem] before:w-[1px] before:bg-stone-200">
                            {stats.eventTimeline.map((item, i) => (
                                <div key={i} className="relative pr-12 group">
                                    <div className="absolute right-0 top-1.5 w-3 h-3 rounded-full border-2 border-zinc-950 z-10 transition-transform group-hover:scale-125" style={{ backgroundColor: item.color }} />
                                    <div className="bg-white/5 border border-stone-200 p-4 rounded-2xl hover:bg-white/10 transition-all cursor-default">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-stone-800 text-sm">{item.name}</h4>
                                            <span className="text-[10px] text-stone-500 font-mono">{item.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[hsla(var(--accent-primary),.15)] text-[hsl(var(--accent-primary))] border-[hsla(var(--accent-primary),.25)]'}`}>
                                                {item.status === 'completed' ? 'منجز' : 'قيد التنفيذ'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>

                    {/* Engagement Trend */}
                    <AnalyticsCard title="منحنى المشاركة الشهرية" subtitle="أداء الطلاب عبر الفصول الدراسية">
                        <ChartContainer height={300}>
                            <AreaChart data={stats.studentEngagementTrend}>
                                <defs>
                                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                                <YAxis stroke="#78716c" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Area type="monotone" dataKey="rate" name="المشاركة" stroke="#6366f1" fillOpacity={1} fill="url(#colorEngagement)" />
                            </AreaChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>
            </div>
        </main>
    );
}
