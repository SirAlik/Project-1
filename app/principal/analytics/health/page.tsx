"use client";

import React from "react";
import {
    PieChart, Pie, Cell, Tooltip,
    XAxis, YAxis, CartesianGrid, Legend,
    AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Activity, Heart, Shield, Droplets, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useHealthAnalytics } from "../_hooks/useHealthAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function HealthAnalytics() {
    const { stats, loading } = useHealthAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب البيانات الصحية...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
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
                                شاشة المؤشرات الصحية
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            متابعة الحالة الصحية العامة، سجل العيادة، ومعايير البيئة المدرسية
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            بيانات مباشرة من العيادة المدرسية
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'زيارات اليوم', value: stats.visitsToday, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
                        { label: 'إجمالي الشهر', value: stats.totalVisitsMonth, icon: Activity, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
                        { label: 'مؤشر النظافة', value: `%${stats.hygieneScore}`, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'المقصف المدرسي', value: stats.canteenStatus, icon: Droplets, color: 'text-[hsl(var(--accent-primary))]', bg: 'bg-[hsla(var(--accent-primary),.15)]', border: 'border-[hsla(var(--accent-primary),.25)]' },
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
                    {/* Visit Trend */}
                    <AnalyticsCard
                        title="منحنى الزيارات اليومية"
                        subtitle="تتبع كثافة مراجعات العيادة خلال الأسبوع"
                        className="lg:col-span-2"
                    >
                        <ChartContainer height={300}>
                            <AreaChart data={stats.visitTrend}>
                                <defs>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                <XAxis dataKey="day" stroke="#78716c" fontSize={11} />
                                <YAxis stroke="#78716c" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Area type="monotone" dataKey="count" name="الزيارات" stroke="#f43f5e" fillOpacity={1} fill="url(#colorVisits)" />
                            </AreaChart>
                        </ChartContainer>
                    </AnalyticsCard>

                    {/* Case Classification */}
                    <AnalyticsCard title="تصنيف الحالات الصحية" subtitle="توزيع الغرض من زيارة العيادة">
                        <ChartContainer height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.caseClassification}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5} dataKey="value"
                                >
                                    {stats.caseClassification.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Legend />
                            </PieChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Hygiene Score Gauge */}
                    <AnalyticsCard title="مؤشر البيئة المدرسية" subtitle="تقييم النظافة والسلامة العامة">
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none" stroke="#e7e5e4" strokeWidth="8"
                                    />
                                    <circle
                                        cx="50" cy="50" r="45"
                                        fill="none" stroke="#10b981" strokeWidth="8"
                                        strokeDasharray="283"
                                        strokeDashoffset={283 - (283 * (stats.hygieneScore / 100))}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-foreground">%{stats.hygieneScore}</span>
                                    <span className="text-[10px] text-stone-500 font-bold uppercase">ممتاز</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-stone-500 text-center leading-relaxed">
                                يعتمد التقييم على آخر ٥ جولات تفتيشية <br />
                                <span className="text-emerald-400 font-bold">الحالة: مطابقة للمعايير</span>
                            </p>
                        </div>
                    </AnalyticsCard>

                    {/* Recent Emergencies/Referrals */}
                    <AnalyticsCard title="حالات التحويل والملاحظة" subtitle="الطلاب الذين تم تحويلهم لجهات خارجية">
                        <div className="space-y-4">
                            {stats.recentEmergency.length > 0 ? stats.recentEmergency.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-stone-200 group hover:bg-rose-500/5 hover:border-rose-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-700">{item.student}</p>
                                            <p className="text-[10px] text-stone-500">{item.reason}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-stone-500">{item.date}</p>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">تحويل خارجي</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-stone-500 text-sm">لا توجد حالات تحويل طارئة مؤخراً</div>
                            )}
                        </div>
                    </AnalyticsCard>
                </div>
            </div>
        </main>
    );
}
