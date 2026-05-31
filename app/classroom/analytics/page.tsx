"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import {
    TrendingUp, AlertCircle,
    Clock, ChevronRight, BarChart3,
    Activity, Flame, GraduationCap
} from "lucide-react";
import Link from "next/link";
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { motion } from "framer-motion";

// Mock Data for Analytics
const BEHAVIOR_DATA = [
    { name: "الأحد", positive: 45, negative: 12 },
    { name: "الاثنين", positive: 52, negative: 8 },
    { name: "الثلاثاء", positive: 38, negative: 15 },
    { name: "الأربعاء", positive: 65, negative: 5 },
    { name: "الخميس", positive: 48, negative: 10 },
];

const CATEGORY_DATA = [
    { name: "مشاركة", value: 400 },
    { name: "سلوك", value: 300 },
    { name: "أكاديمي", value: 300 },
    { name: "تأخر", value: 200 },
];

const COLORS = ["var(--primary)", "var(--accent)", "var(--warning)", "var(--danger)"];

const TOP_STUDENTS = [
    { name: "أحمد العتيبي", score: 120, trend: "up", badges: 5 },
    { name: "خالد منصور", score: 115, trend: "up", badges: 4 },
    { name: "ياسر الحربي", score: 98, trend: "down", badges: 3 },
];

const RISK_STUDENTS = [
    { name: "عمر خالد", incidents: 8, type: "تأخر متكرر", urgency: "high" },
    { name: "سعد محمد", incidents: 5, type: "عدم إحضار واجب", urgency: "medium" },
];

export default function TeacherAnalyticsPage() {
    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-8 font-sans" dir="rtl">
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 glass-panel p-8 rounded-[40px] border border-white/5">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-3xl flex items-center justify-center shadow-2xl shadow-[var(--primary)]/20">
                            <BarChart3 className="text-white w-8 h-8 icon-morph" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Link href="/classroom" className="text-[10px] font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest text-zinc-400">
                                    الفصول
                                </Link>
                                <ChevronRight className="w-3 h-3 opacity-20" />
                                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">التحليلات المتقدمة</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-[var(--text)]">
                                مركز تحليل بيانات المعلم
                            </h1>
                        </div>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard title="إجمالي النقاط" value="2,450" change="+12%" icon={TrendingUp} color="primary" />
                    <KPICard title="معدل الانضباط" value="94%" change="+2%" icon={Activity} color="accent" />
                    <KPICard title="الطلاب الأكثر نشاطاً" value="18" change="استقرار" icon={Flame} color="warning" />
                    <KPICard title="حالات التدخل المطلوبة" value="3" change="-1" icon={AlertCircle} color="danger" />
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Main Charts */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card title="تحليل السلوك الأسبوعي" className="p-8 border-white/5 bg-zinc-900/50">
                            <ChartContainer height={400} className="mt-6">
                                <AreaChart data={BEHAVIOR_DATA}>
                                    <defs>
                                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#ffffff30"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#71717a' }}
                                    />
                                    <YAxis
                                        stroke="#ffffff30"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#71717a' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="positive" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorPos)" />
                                    <Area type="monotone" dataKey="negative" stroke="var(--danger)" strokeWidth={4} fillOpacity={1} fill="url(#colorNeg)" />
                                </AreaChart>
                            </ChartContainer>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Card title="تصنيف الإجراءات" className="p-8 border-white/5 bg-zinc-900/50">
                                <ChartContainer height={300}>
                                    <PieChart>
                                        <Pie
                                            data={CATEGORY_DATA}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {CATEGORY_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                                        />
                                    </PieChart>
                                </ChartContainer>
                                <div className="flex justify-center gap-4 mt-4">
                                    {CATEGORY_DATA.map((item, i) => (
                                        <div key={item.name} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                            <span className="text-[10px] font-bold text-zinc-400">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card title="سجل الخروج (العيادة/دورة المياه)" className="p-8 border-white/5 bg-zinc-900/50">
                                <div className="space-y-4">
                                    {["١٢٠ دقيقة إجمالي خروج اليوم", "أكثر الأوقات خروجاً: ١٠:٣٠ ص", "متوسط المدة: ٦ دقائق"].map((stat, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <Clock className="w-4 h-4 text-indigo-400" />
                                            <span className="text-xs font-black text-zinc-300">{stat}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Top/Risk Students */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card title="فرسان الحصة 🏆" className="p-8 border-white/5 bg-zinc-900/50">
                            <div className="space-y-4">
                                {TOP_STUDENTS.map((s, i) => (
                                    <div key={s.name} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-white">{s.name}</p>
                                                <p className="text-[9px] text-zinc-500 font-bold">{s.badges} أوسمة</p>
                                            </div>
                                        </div>
                                        <div className="text-xs font-black text-emerald-400">
                                            {s.score} نقطة
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="تنبيهات التدخل 🚨" className="p-8 border-rose-500/20 bg-rose-500/5">
                            <div className="space-y-4">
                                {RISK_STUDENTS.map((s) => (
                                    <div key={s.name} className="p-4 rounded-2xl bg-zinc-900/80 border border-white/5">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-black text-white">{s.name}</p>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${s.urgency === 'high' ? 'bg-rose-500 text-white' : 'bg-[hsl(var(--gold))] text-white'}`}>
                                                {s.urgency === 'high' ? 'حرج' : 'متوسط'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-bold mb-3">{s.type} ({s.incidents} مرات)</p>
                                        <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black text-zinc-300 transition-all">
                                            عرض السجل التفصيلي
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <div className="p-6 rounded-[32px] gradient-bg text-white flex flex-col items-center text-center">
                            <GraduationCap className="w-10 h-10 mb-4 opacity-50" />
                            <h4 className="text-sm font-black mb-2">توصية الذكاء الاصطناعي</h4>
                            <p className="text-[11px] font-medium leading-relaxed opacity-90">
                                يظهر تحليل البيانات تحسناً بنسبة ١٥٪ في مشاركة الطلاب عند استخدام استراتيجية &quot;المعلم الصغير&quot; في بداية الحصة.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

interface LocalKPIProps { title: string; value: string | number; change?: string; icon: React.ComponentType<{ className?: string }>; color: string; }
function KPICard({ title, value, change, icon: Icon, color }: LocalKPIProps) {
    const colors: Record<string, string> = {
        primary: "from-[var(--primary)]/20 to-[var(--primary)]/0 text-[var(--primary)] border-[var(--primary)]/20",
        accent: "from-[var(--accent)]/20 to-[var(--accent)]/0 text-[var(--accent)] border-[var(--accent)]/20",
        danger: "from-[var(--danger)]/20 to-[var(--danger)]/0 text-[var(--danger)] border-[var(--danger)]/20",
        warning: "from-[var(--warning)]/20 to-[var(--warning)]/0 text-[var(--warning)] border-[var(--warning)]/20",
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`p-6 rounded-[32px] bg-gradient-to-br ${colors[color]} border backdrop-blur-xl relative overflow-hidden`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/5`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black opacity-60">{change}</span>
            </div>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1 relative z-10">{title}</p>
            <h4 className="text-2xl font-black text-white relative z-10">{value}</h4>
        </motion.div>
    );
}
