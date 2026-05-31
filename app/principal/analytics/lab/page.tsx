"use client";

import React from "react";
import {
    PieChart, Pie, Cell, Tooltip, Legend
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Beaker, ShieldCheck, Database, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useLabAnalytics } from "../_hooks/useLabAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function LabAnalytics() {
    const { stats, loading } = useLabAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[hsla(var(--gold),.25)] border-t-[hsl(var(--gold))] rounded-full animate-spin" />
                    <p className="text-zinc-500 font-medium animate-pulse">جاري جلب إحصائيات المختبر...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[hsla(var(--gold),.05)] rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[hsla(var(--gold),.05)] rounded-full blur-[120px]" />
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
                                مراقبة المختبر والعلوم
                            </h1>
                        </div>
                        <p className="text-zinc-500 mr-12 text-sm italic">
                            تتبع التجارب المنفذة، إشغال المعامل، وسلامة العهدة
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <div className="w-2 h-2 bg-[hsl(var(--gold))] rounded-full animate-pulse" />
                            رصد حي للتجارب العملية
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'التجارب المنفذة', value: stats.totalExperiments, icon: Beaker, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsla(var(--gold),.15)]', border: 'border-[hsla(var(--gold),.25)]' },
                        { label: 'نسبة الإشغال', value: `%${stats.occupancyRate}`, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
                        { label: 'سلامة المعدات', value: '٪٩٦', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'إجمالي العهدة', value: '١٢٤', icon: Database, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
                    ].map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-[2rem] bg-zinc-900/30 border ${item.border} backdrop-blur-xl relative overflow-hidden group`}
                        >
                            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <item.icon className="w-16 h-16" />
                            </div>
                            <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</p>
                            <h2 className="text-3xl font-black text-white">{item.value}</h2>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Experiment Target Gauge */}
                    <AnalyticsCard title="مستهدف التجارب" subtitle="نسبة الإنجاز مقارنة بالمخطط الفصلي">
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="relative w-48 h-48">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                        cx="50" cy="50" r="40"
                                        fill="none" stroke="#27272a" strokeWidth="10"
                                        strokeDasharray="251.2"
                                        strokeDashoffset="0"
                                    />
                                    <circle
                                        cx="50" cy="50" r="40"
                                        fill="none" stroke="hsl(var(--gold))" strokeWidth="10"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 - (251.2 * (stats.totalExperiments / stats.experimentTarget))}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black text-white">{stats.totalExperiments}</span>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase">من {stats.experimentTarget}</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-zinc-400 text-center leading-relaxed">
                                معدل الإنجاز الحالي <br />
                                <span className="text-[hsl(var(--gold))] font-bold">متوافق مع الخطة الزمنية</span>
                            </p>
                        </div>
                    </AnalyticsCard>

                    {/* Asset Condition Donut */}
                    <AnalyticsCard title="حالة العهدة والمعدات" subtitle="تتبع الصيانة والجاهزية الفنية">
                        <ChartContainer height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.assetCondition}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5} dataKey="value"
                                >
                                    {stats.assetCondition.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem', color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    </AnalyticsCard>

                    {/* Recent Bookings */}
                    <AnalyticsCard title="آخر حجوزات المختبر" subtitle="تنسيق استخدام المعامل">
                        <div className="space-y-4">
                            {stats.recentBookings.map((booking, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-white/5">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-200">{booking.teacher}</p>
                                        <p className="text-[10px] text-zinc-500">{booking.experiment}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-400">{booking.date}</p>
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border ${booking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                                            {booking.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>
                </div>

                {/* Heatmap Section */}
                <AnalyticsCard
                    title="تحليل إشغال المعامل"
                    subtitle="توزيع الحصص العملية خلال الأسبوع الدراسي"
                >
                    <div className="flex flex-col gap-2 overflow-x-auto pb-4">
                        <div className="flex gap-2 mb-2 pr-12">
                            {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                <div key={p} className="flex-1 text-center text-[10px] text-zinc-500 font-bold">ح {p}</div>
                            ))}
                        </div>
                        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map(day => (
                            <div key={day} className="flex items-center gap-4">
                                <div className="w-10 text-[10px] text-zinc-400 font-bold">{day}</div>
                                <div className="flex-1 flex gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map(period => {
                                        const val = stats.occupancyHeatmap.find(h => h.day === day && h.period === period)?.value || 0;
                                        const opacity = Math.min(val * 0.2 + 0.1, 1);
                                        return (
                                            <div
                                                key={period}
                                                className="flex-1 h-12 rounded-lg transition-all hover:scale-105 cursor-pointer relative group/hex"
                                                style={{
                                                    backgroundColor: val > 0 ? `hsla(var(--gold), ${opacity})` : 'rgba(255, 255, 255, 0.05)',
                                                    boxShadow: val > 3 ? `0 0 10px hsla(var(--gold), 0.2)` : 'none'
                                                }}
                                            >
                                                {val > 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hex:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-white">{val}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </AnalyticsCard>
            </div>
        </main>
    );
}
