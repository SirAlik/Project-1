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

const COLORS = ["var(--primary)", "var(--accent)", "var(--warning)", "var(--danger)"];

export default function TeacherAnalyticsPage() {
    return (
        <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-8 font-sans" dir="rtl">
            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 glass-panel p-8 rounded-[40px] border border-stone-200">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-3xl flex items-center justify-center shadow-2xl shadow-[var(--primary)]/20">
                            <BarChart3 className="text-white w-8 h-8 icon-morph" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Link href="/classroom" className="text-[10px] font-black opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest">
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
                    <KPICard title="إجمالي النقاط" value="—" icon={TrendingUp} color="primary" />
                    <KPICard title="معدل الانضباط" value="—" icon={Activity} color="accent" />
                    <KPICard title="الطلاب الأكثر نشاطاً" value="—" icon={Flame} color="warning" />
                    <KPICard title="حالات التدخل المطلوبة" value="—" icon={AlertCircle} color="danger" />
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Main Charts */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card title="تحليل السلوك الأسبوعي" className="p-8">
                            <ChartContainer height={400} className="mt-6">
                                <AreaChart data={[]}>
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
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px' }} />
                                    <Area type="monotone" dataKey="positive" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorPos)" />
                                    <Area type="monotone" dataKey="negative" stroke="var(--danger)" strokeWidth={4} fillOpacity={1} fill="url(#colorNeg)" />
                                </AreaChart>
                            </ChartContainer>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Card title="تصنيف الإجراءات" className="p-8">
                                <ChartContainer height={300}>
                                    <PieChart>
                                        <Pie data={[]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {([] as { name: string }[]).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px' }} />
                                    </PieChart>
                                </ChartContainer>
                                <p className="text-center text-xs text-[var(--muted)] mt-4 opacity-60">لا توجد بيانات متاحة</p>
                            </Card>

                            <Card title="سجل الخروج (العيادة/دورة المياه)" className="p-8">
                                <div className="space-y-4">
                                    {([] as string[]).length === 0 && (
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                                            <Clock className="w-4 h-4 text-[var(--muted)]" />
                                            <span className="text-xs font-medium text-[var(--muted)]">لا توجد سجلات اليوم</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card title="فرسان الحصة" className="p-8">
                            <div className="flex flex-col items-center justify-center py-8 opacity-40">
                                <GraduationCap className="w-10 h-10 mb-2 text-[var(--muted)]" />
                                <p className="text-xs font-bold text-[var(--muted)]">لا توجد بيانات متاحة</p>
                            </div>
                        </Card>

                        <Card title="تنبيهات التدخل" className="p-8 border-rose-200">
                            <div className="flex flex-col items-center justify-center py-8 opacity-40">
                                <AlertCircle className="w-10 h-10 mb-2 text-rose-400" />
                                <p className="text-xs font-bold text-[var(--muted)]">لا توجد تنبيهات حالياً</p>
                            </div>
                        </Card>

                        <div className="p-6 rounded-[32px] gradient-bg text-white flex flex-col items-center text-center">
                            <GraduationCap className="w-10 h-10 mb-4 opacity-50" />
                            <h4 className="text-sm font-black mb-2">توصية الذكاء الاصطناعي</h4>
                            <p className="text-[11px] font-medium leading-relaxed opacity-70">
                                ستظهر التوصيات بعد اكتمال بيانات الفصل.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

interface LocalKPIProps { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string; }
function KPICard({ title, value, icon: Icon, color }: LocalKPIProps) {
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
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] flex items-center justify-center border border-[var(--border)]">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1 relative z-10">{title}</p>
            <h4 className="text-2xl font-black text-[var(--text)] relative z-10">{value}</h4>
        </motion.div>
    );
}
