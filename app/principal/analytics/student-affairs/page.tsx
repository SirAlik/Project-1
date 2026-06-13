"use client";

import React, { useState } from "react";
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, Users, AlertTriangle, CheckCircle, Clock, MoreVertical } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useStudentAffairsAnalytics } from "../_hooks/useStudentAffairsAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function StudentAffairsAnalyticsPage() {
    const [selectedGrade, setSelectedGrade] = useState(""); // Added state
    const { stats, loading } = useStudentAffairsAnalytics();

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب البيانات التحليلية...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/5 rounded-full blur-[120px]" />
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
                                الرادار التحليلي: وكيل شؤون الطلاب
                            </h1>
                            {/* Added select element based on the instruction */}
                            <select
                                value={selectedGrade}
                                onChange={(e) => setSelectedGrade(e.target.value)}
                                className="bg-stone-100 border-none rounded-xl px-4 py-2 text-sm font-bold text-stone-600 outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="تصفية حسب الصف"
                            >
                                <option value="">جميع الصفوف</option>
                                <option value="1">الصف الأول</option>
                                <option value="2">الصف الثاني</option>
                                <option value="3">الصف الثالث</option>
                                {/* Add more options as needed */}
                            </select>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            تحليل متقدم لمعدلات الانضباط، الغياب، والسلوك الطلابي
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            بيانات مباشرة من نظام Supabase
                        </div>
                    </div>
                </header>

                {/* Top KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'نسبة الحضور', value: `%${stats.attendanceRate}`, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
                        { label: 'نسبة الانضباط', value: `%${stats.disciplineRate}`, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
                        { label: 'نسبة التأخر الصباحي', value: `%${stats.lateRate}`, icon: Clock, color: 'text-[hsl(var(--accent-primary))]', bg: 'bg-[hsla(var(--accent-primary),.15)]', border: 'border-[hsla(var(--accent-primary),.25)]' },
                        { label: 'طلاب تحت الملاحظة (EWS)', value: stats.activeEWS, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
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

                {/* Main Content Sections */}
                <div className="space-y-8">
                    {/* Row 1: Trends and Absence Types */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <AnalyticsCard
                            title="اتجاهات الحضور والغياب"
                            subtitle="تحليل كمي للثلاثين يوماً الماضية"
                            className="lg:col-span-2"
                        >
                            <ChartContainer height={300}>
                                    <AreaChart data={stats.attendanceTrend}>
                                        <defs>
                                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#78716c"
                                            fontSize={10}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis stroke="#78716c" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917', textAlign: 'right' }}
                                            itemStyle={{ fontSize: '10px' }}
                                        />
                                        <Area type="monotone" dataKey="present" name="حضور" stroke="#6366f1" fillOpacity={1} fill="url(#colorPresent)" />
                                        <Area type="monotone" dataKey="absent" name="غياب" stroke="#f43f5e" fillOpacity={1} fill="url(#colorAbsent)" />
                                    </AreaChart>
                                </ChartContainer>
                        </AnalyticsCard>

                        <AnalyticsCard title="توزيع أنواع الغياب" subtitle="مقارنة بين الأعذار المقبولة وغير المقبولة">
                            <div className="relative">
                                <ChartContainer height={300}>
                                    <PieChart>
                                        <Pie
                                            data={stats.absenceDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.absenceDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917', textAlign: 'right' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-foreground">{stats.absenceDistribution.reduce((acc, curr) => acc + curr.value, 0)}</span>
                                    <span className="text-[10px] text-stone-500 font-bold uppercase">إجمالي الغيابات</span>
                                </div>
                            </div>
                        </AnalyticsCard>
                    </div>

                    {/* Row 2: Heatmap and Class Lateness */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <AnalyticsCard
                            title="خريطة الذروة الزمنية للتأخر"
                            subtitle="توزيع حالات التأخر حسب اليوم والساعة"
                            className="lg:col-span-2"
                        >
                            <div className="flex flex-col gap-2 overflow-x-auto pb-4">
                                <div className="flex gap-2 mb-2 pr-12">
                                    {[7, 8, 9, 10, 11, 12].map(h => (
                                        <div key={h} className="flex-1 text-center text-[10px] text-stone-500 font-bold">{h}:00</div>
                                    ))}
                                </div>
                                {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map(day => (
                                    <div key={day} className="flex items-center gap-4">
                                        <div className="w-8 text-[10px] text-stone-500 font-bold">{day}</div>
                                        <div className="flex-1 flex gap-2">
                                            {[7, 8, 9, 10, 11, 12].map(hour => {
                                                const val = stats.weeklyHeatmap.find(h => h.day === day && h.hour === hour)?.value || 0;
                                                const opacity = Math.min(val * 0.2 + 0.1, 1);
                                                return (
                                                    <div
                                                        key={hour}
                                                        className="flex-1 h-12 rounded-lg transition-all hover:scale-105 cursor-pointer relative group/hex"
                                                        {...{
                                                            style: {
                                                                backgroundColor: val > 0 ? `rgba(99, 102, 241, ${opacity})` : 'rgba(255, 255, 255, 0.05)',
                                                                boxShadow: val > 5 ? `0 0 10px rgba(99, 102, 241, 0.2)` : 'none'
                                                            } as React.CSSProperties
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

                        <AnalyticsCard title="كثافة التأخر حسب الفصول" subtitle="أعلى ٥ فصول تسجيلاً لحالات التأخر">
                            <ChartContainer height={300}>
                                    <BarChart data={stats.classLateness} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                                        <XAxis type="number" stroke="#78716c" fontSize={10} hide />
                                        <YAxis dataKey="class" type="category" stroke="#9ca3af" fontSize={11} width={60} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917', textAlign: 'right' }}
                                        />
                                        <Bar dataKey="count" name="عدد الحالات" fill="#a855f7" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ChartContainer>
                        </AnalyticsCard>
                    </div>

                    {/* Row 3: Top Students */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnalyticsCard title="الطلاب الأكثر تأخراً" subtitle="قائمة التنبيه المبكر السلوكية">
                            <div className="space-y-4">
                                {stats.topLateStudents.length > 0 ? stats.topLateStudents.map((student, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-stone-200 group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-sm text-stone-700">{student.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-black rounded-full">
                                                {student.count} حالات
                                            </span>
                                            <button className="p-1 hover:bg-white/10 rounded" aria-label="خيارات">
                                                <MoreVertical size={14} className="text-stone-500" />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-stone-500 text-sm">
                                        لا يوجد سجلات كافية حالياً
                                    </div>
                                )}
                            </div>
                        </AnalyticsCard>
                    </div>
                </div>
            </div>
        </main>
    );
}
