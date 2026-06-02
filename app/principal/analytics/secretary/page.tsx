"use client";

import React from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { ArrowLeft, FileText, Send, Calendar, HardDrive } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { useSecretaryAnalytics } from "../_hooks/useSecretaryAnalytics";
import { AnalyticsCard } from "../_components/AnalyticsCard";

export default function SecretaryAnalytics() {
    const { stats, loading } = useSecretaryAnalytics();
    const completionTargetDays = 2;
    const completionEfficiency = stats.avgCompletionDays > 0
        ? Math.max(0, Math.min(1, completionTargetDays / stats.avgCompletionDays))
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-stone-500 font-medium animate-pulse">جاري جلب إحصائيات السكرتارية...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans p-6" dir="rtl">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
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
                                نبض السكرتارية والمكتب
                            </h1>
                        </div>
                        <p className="text-stone-500 mr-12 text-sm italic">
                            متابعة تدفق المعاملات، الإجازات، والطلبات الإدارية
                        </p>
                    </div>

                    <div className="bg-white/80 border border-stone-200 px-4 py-2 rounded-2xl backdrop-blur-md">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            تحديث فوري للسجلات
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'وارد قيد المعالجة', value: stats.pendingInbox, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
                        { label: 'صادر قيد الإرسال', value: stats.pendingOutbox, icon: Send, color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' },
                        { label: 'طلبات إجازة معلقة', value: stats.activeLeaves, icon: Calendar, color: 'text-[hsl(var(--gold))]', bg: 'bg-[hsla(var(--gold),.15)]', border: 'border-[hsla(var(--gold),.25)]' },
                        { label: 'طلبات شراء معلقة', value: stats.pendingProcurement, icon: HardDrive, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Correspondence Trend */}
                    <AnalyticsCard
                        title="تحليل تدفق المعاملات"
                        subtitle="مقارنة بين الوارد والصادر خلال ٦ أشهر"
                        className="lg:col-span-2"
                    >
                        <ChartContainer height={350}>
                            <BarChart data={stats.correspondenceTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                                <XAxis dataKey="month" stroke="#78716c" fontSize={11} />
                                <YAxis stroke="#78716c" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '1rem', color: '#1c1917', textAlign: 'right' }}
                                />
                                <Legend />
                                <Bar dataKey="incoming" name="وارد" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="outgoing" name="صادر" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    </AnalyticsCard>

                    {/* Gauge/Efficiency Section */}
                    <div className="space-y-6">
                        <AnalyticsCard title="سرعة الإنجاز" subtitle="متوسط زمن معالجة الخطاب">
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="relative w-40 h-40">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle
                                            cx="50" cy="50" r="45"
                                            fill="none" stroke="#e7e5e4" strokeWidth="8"
                                        />
                                        <circle
                                            cx="50" cy="50" r="45"
                                            fill="none" stroke="var(--primary)" strokeWidth="8"
                                            strokeDasharray="283"
                                            strokeDashoffset={283 - (283 * completionEfficiency)}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-foreground">{stats.avgCompletionDays}</span>
                                        <span className="text-[10px] text-stone-500 font-bold uppercase">أيام</span>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-stone-500 text-center leading-relaxed">
                                    هدف المكتب: أقل من ٢ يوم <br />
                                    <span className="text-emerald-400 font-bold">
                                        {stats.avgCompletionDays > 0 ? "محسوبة من البيانات اليومية" : "لا توجد بيانات إنجاز كافية"}
                                    </span>
                                </p>
                            </div>
                        </AnalyticsCard>

                        <AnalyticsCard title="أحدث التحركات" subtitle="آخر ٥ معاملات تم تسجيلها">
                            <div className="space-y-3">
                                {stats.recentActions.map((action, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-stone-200">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${action.type === 'وارد' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-sky-500/20 text-sky-400'}`}>
                                                {action.type[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-700 truncate w-32">{action.title}</p>
                                                <p className="text-[10px] text-stone-500">{action.date}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-500 border border-stone-200">
                                            {action.status}
                                        </span>
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
