"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    AreaChart, Area, Cell
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Users, ShieldAlert, HeartHandshake, MapPin, BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useCounselorAnalytics } from "../_hooks/useCounselorAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function CounselorAnalytics() {
    const { stats, loading } = useCounselorAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب بيانات التوجيه والإرشاد...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
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
                                مؤشرات الاستقرار السلوكي
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            تحليل الحالات الإرشادية، معدلات التعافي، وخارطة التحديات الميدانية
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                            رصد استباقي للحالات الاجتماعية والتربوية
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'حالات مفتوحة', value: stats.activeCases, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
                        { label: 'جلسات الشهر', value: stats.sessionsThisMonth, icon: HeartHandshake, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
                        { label: 'معدل التعافي', value: `%${stats.recoveryRate}`, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'بلاغات أولياء الأمور', value: stats.pendingReports, icon: Users, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsla(var(--gold),.15)]', border: 'border-[hsla(var(--gold),.25)]' },
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
                    {/* Case Pyramid (Funnel/Bar Hybrid) */}
                    <AnalyticsCard title="هرم توزيع الحالات" subtitle="تصنيف الحالات حسب الاحتياج الإرشادي">
                        <ChartContainer height={300} className="pt-4">
                            <BarChart data={stats.casePyramid} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {stats.casePyramid.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </AnalyticsCard>

                    {/* recovery/Sessions Trend */}
                    <AnalyticsCard title="نشاط الجلسات الإرشادية" subtitle="معدل الزيارات والجلسات المنفذة شهرياً" className="lg:col-span-2">
                        <ChartContainer height={300}>
                            <AreaChart data={stats.monthlySessions}>
                                <defs>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
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
                                <Area type="monotone" dataKey="count" name="الجلسات" stroke="#6366f1" fillOpacity={1} fill="url(#colorSessions)" />
                            </AreaChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Issues Map (Bubble/Scatter as Location Map) */}
                    <AnalyticsCard title="خارطة التحديات السلوكية" subtitle="أكثر المواقع تسجيلاً للملاحظات في المدرسة">
                        <div className="h-[250px] w-full flex items-center justify-center">
                            <div className="relative w-full h-full bg-white/5 rounded-[2rem] border border-stone-200 overflow-hidden">
                                {stats.issueLocations.map((loc, i) => {
                                    const top = [20, 60, 40, 80, 30][i];
                                    const left = [30, 20, 70, 50, 85][i];
                                    const size = loc.value * 5 + 40;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="absolute flex items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/40 cursor-default group"
                                            style={{
                                                top: `${top}%`,
                                                left: `${left}%`,
                                                width: size,
                                                height: size,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        >
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-foreground">{loc.name}</p>
                                                <p className="text-[8px] text-indigo-400 font-bold">{loc.value}</p>
                                            </div>
                                            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping opacity-20 pointer-events-none" />
                                        </motion.div>
                                    );
                                })}
                                {/* Labels mapping */}
                                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-stone-500" />
                                    <span className="text-[8px] text-stone-500 uppercase font-black">المواقع المرصودة حياً</span>
                                </div>
                            </div>
                        </div>
                    </AnalyticsCard>

                    {/* Recent Cases List */}
                    <AnalyticsCard title="أحدث المعاملات المستلمة" subtitle="آخر ٥ حالات تم فتحها">
                        <div className="space-y-3">
                            {stats.recentCases.map((c, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-stone-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-stone-200 flex items-center justify-center border border-stone-200">
                                            <ShieldAlert className="w-4 h-4 text-stone-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-stone-700 truncate w-40">{c.title}</p>
                                            <p className="text-[9px] text-stone-500">{c.category}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${c.status === 'مغلقة' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </AnalyticsCard>
                </div>
            </div>
        </main>
    );
}
