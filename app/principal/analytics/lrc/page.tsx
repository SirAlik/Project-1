"use client";

import React from "react";
import {
    PieChart, Pie, Cell, Tooltip,
    Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Book, RefreshCw, AlertCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useLRCAnalytics } from "../_hooks/useLRCAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function LRCAnalytics() {
    const { stats, loading } = useLRCAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب إحصائيات المكتبة...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
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
                                رادار مصادر التعلم والمكتبة
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            تحليل حركة الاستعارة، نشاط القراءة، وإشغال المكتبة
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            بيانات مباشرة من نظام الفهرسة
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'إعارات اليوم', value: stats.booksBorrowedToday, icon: Book, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                        { label: 'نسبة الإرجاع', value: `%${stats.returnRate}`, icon: RefreshCw, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'كتب متأخرة', value: stats.overdueCount, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
                        { label: 'إجمالي الكتب', value: stats.totalBooks, icon: BookOpen, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsla(var(--gold),.15)]', border: 'border-[hsla(var(--gold),.25)]' },
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
                    {/* Category Distribution */}
                    <AnalyticsCard title="توزيع الكتب حسب التصنيف" subtitle="الأقسام الأكثر طلباً في المكتبة">
                        <ChartContainer height={300}>
                            <PieChart>
                                <Pie
                                    data={stats.categoryDistribution}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5} dataKey="value"
                                >
                                    {stats.categoryDistribution.map((entry, index) => (
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

                    {/* Top Readers */}
                    <AnalyticsCard title="أكثر القراء نشاطاً" subtitle="قائمة العشرة الأوائل" className="lg:col-span-1">
                        <div className="space-y-3">
                            {stats.topReaders.length > 0 ? stats.topReaders.map((reader, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-stone-200 group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-blue-500/20">
                                            {i + 1}
                                        </div>
                                        <span className="font-bold text-sm text-stone-700">{reader.name}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-stone-200 text-stone-500 text-[10px] font-black rounded-full border border-stone-200">
                                        {reader.count} كتب
                                    </span>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-stone-500 text-sm">لا توجد بيانات إعارة حالياً</div>
                            )}
                        </div>
                    </AnalyticsCard>

                    {/* Most Borrowed Books */}
                    <AnalyticsCard title="الكتب الأكثر استعارة" subtitle="أعلى ٥ كتب طلباً">
                        <ChartContainer height={300}>
                            <BarChart data={stats.topBooks} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="title" type="category" stroke="#9ca3af" fontSize={10} width={100} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </AnalyticsCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Heatmap Section */}
                    <AnalyticsCard
                        title="خريطة ذروة الزيارات"
                        subtitle="توزيع الحصص والزيارات خلال الأسبوع"
                        className="lg:col-span-4"
                    >
                        <div className="flex flex-col gap-2 overflow-x-auto pb-4">
                            <div className="flex gap-2 mb-2 pr-12">
                                {[1, 2, 3, 4, 5, 6, 7].map(p => (
                                    <div key={p} className="flex-1 text-center text-[10px] text-stone-500 font-bold">ح {p}</div>
                                ))}
                            </div>
                            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map(day => (
                                <div key={day} className="flex items-center gap-4">
                                    <div className="w-10 text-[10px] text-stone-500 font-bold">{day}</div>
                                    <div className="flex-1 flex gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map(period => {
                                            const val = stats.visitHeatmap.find(h => h.day === day && h.period === period)?.value || 0;
                                            const opacity = Math.min(val * 0.1 + 0.1, 1);
                                            return (
                                                <div
                                                    key={period}
                                                    className="flex-1 h-12 rounded-lg transition-all hover:scale-105 cursor-pointer relative group/hex"
                                                    style={{
                                                        backgroundColor: val > 0 ? `rgba(59, 130, 246, ${opacity})` : 'rgba(255, 255, 255, 0.05)',
                                                    }}
                                                >
                                                    {val > 0 && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hex:opacity-100 transition-opacity">
                                                            <span className="text-[10px] font-black text-foreground">{val}</span>
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
            </div>
        </main>
    );
}
