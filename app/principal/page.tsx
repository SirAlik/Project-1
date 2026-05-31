"use client";

import React from "react";
import { KPICard } from "@/components/ui/KPICard";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

import { DisciplineKnightsModal } from "@/components/admin/DisciplineKnightsModal";
import { ClassNavigatorModal } from "./analytics/_components/ClassNavigatorModal";
import { SentinelDashboard } from "./analytics/_components/SentinelDashboard";
import { Trophy, Microscope, BookOpen, Shield, TrendingUp, Bell } from "lucide-react";
import { supabase } from "@/lib/db/supabase";
import { usePrincipalKPIs } from "./_hooks/usePrincipalKPIs";
import { AIInsightCard } from "@/components/ai/AIInsightCard";

export default function PrincipalPage() {
    const [isKnightsOpen, setIsKnightsOpen] = React.useState(false);
    const [isClassNavigatorOpen, setIsClassNavigatorOpen] = React.useState(false);
    const [classes, setClasses] = React.useState<{ id: string; name: string; grade_level: number }[]>([]);
    const { kpis, loading: kpisLoading, date: kpisDate } = usePrincipalKPIs();

    React.useEffect(() => {
        async function fetchClasses() {
            const { data } = await supabase
                .from("classes")
                .select("id, name, grade_level")
                .in("grade_level", [4, 5, 6]);
            if (data) setClasses(data);
        }
        fetchClasses();
    }, []);

    return (
        <main className="min-h-screen bg-bg-canvas text-text-inverse font-sans pb-20" dir="rtl">
            <div className="relative z-10 mx-auto max-w-7xl px-8 py-10">
                {/* Futuristic Header */}
                <header className="mb-10 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                                <Shield className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-primary">
                                مكتب مدير المدرسة
                            </h1>
                            <p className="mt-1 text-sm font-bold text-text-secondary uppercase tracking-widest">
                                غرفة القيادة والتحليل الذكي • رؤية 2030
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsKnightsOpen(true)}
                            className="flex items-center gap-3 surface-block px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-text-primary hover:border-accent transition-all group"
                        >
                            <Trophy className="w-5 h-5 text-accent group-hover:rotate-12 transition-transform" />
                            فرسان الانضباط
                        </button>
                        <div className="w-12 h-12 rounded-2xl surface-block flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                            <Bell className="w-6 h-6" />
                        </div>
                    </div>
                </header>

                {/* Top KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <KPICard
                        title="الحضور العام"
                        value={kpisLoading ? '...' : kpis?.attendance_rate != null ? `%${kpis.attendance_rate}` : '--'}
                        trend="up"
                        color="primary"
                        metricId="attendance_rate"
                    />
                    <KPICard
                        title="جودة بيئة التعلم"
                        value="8.4/10"
                        trend="up"
                        color="accent"
                        metricId="learning_quality"
                    />
                    <KPICard
                        title="غائبون اليوم"
                        value={kpisLoading ? '...' : kpis?.absent_count != null ? `${kpis.absent_count}` : '--'}
                        trend="down"
                        color="destructive"
                        metricId="critical_absence"
                    />
                    <KPICard
                        title="مؤشر رضا المعلمين"
                        value="92%"
                        color="primary"
                        trend="up"
                        metricId="teacher_satisfaction"
                    />
                </div>

                {/* Secondary stats bar from analytics cache */}
                {!kpisLoading && kpis && (
                    <div className="flex flex-wrap gap-3 mb-8 text-[11px] font-bold">
                        {[
                            { label: 'متأخرون', val: kpis.late_count,         color: 'text-accent' },
                            { label: 'بلاغات سلوكية', val: kpis.behavioral_today, color: 'text-destructive' },
                            { label: 'زيارات العيادة', val: kpis.health_cases_today, color: 'text-primary' },
                            { label: 'زيارات المكتبة', val: kpis.lrc_visits_today, color: 'text-primary' },
                        ].map(s => (
                            <span key={s.label} className="surface-block px-4 py-2 rounded-xl flex items-center gap-2">
                                <span className={s.color}>{s.val ?? '--'}</span>
                                <span className="text-text-secondary">{s.label}</span>
                            </span>
                        ))}
                        {kpisDate && (
                            <span className="surface-block px-4 py-2 rounded-xl text-text-secondary font-mono">
                                {kpisDate}
                            </span>
                        )}
                    </div>
                )}


                {/* AI Insight */}
                <div className="mb-10">
                    <AIInsightCard
                        contextType="school_overview"
                        title="الرؤية الذكية — نظرة عامة على المدرسة"
                    />
                </div>

                {/* Operational Command Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                    {/* Hotspots Map */}
                    <Card title="خريطة التنبيهات التشغيلية (Hotspots)" className="lg:col-span-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-5">
                                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> فصول تتطلب اهتماماً
                                </h3>
                                {[
                                    { room: "4/أ", score: 2.5, issues: 3 },
                                    { room: "6/ج", score: 3.0, issues: 2 },
                                    { room: "5/ب", score: 3.2, issues: 2 },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-bg-surface/30 border border-border-subtle p-4 rounded-2xl hover:bg-bg-surface/50 transition-colors border-r-4 border-r-destructive/40">
                                        <div>
                                            <p className="font-bold text-sm text-text-primary">فصل {item.room}</p>
                                            <p className="text-[10px] text-text-secondary">{item.issues} بلاغات نشطة</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-destructive">{item.score}/5</p>
                                            <div className="w-20 h-1.5 bg-bg-surface/50 rounded-full mt-1.5 overflow-hidden">
                                                <div className="h-full bg-destructive rounded-full" style={{ width: `${item.score * 20}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-5">
                                <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                                    <Microscope className="w-3 h-3" /> طلبات صيانة حرجة
                                </h3>
                                {[
                                    { type: "تكييف", loc: "مختبر 1", days: 1 },
                                    { type: "إنارة", loc: "ممر 2", days: 3 },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-bg-surface/30 border border-border-subtle p-4 rounded-2xl hover:bg-bg-surface/50 transition-colors border-r-4 border-r-accent/40">
                                        <div>
                                            <p className="font-bold text-sm text-text-primary">{item.type}</p>
                                            <p className="text-[10px] text-text-secondary">{item.loc}</p>
                                        </div>
                                        <span className="text-[10px] bg-accent/20 text-accent px-3 py-1.5 rounded-full font-bold">منذ {item.days} يوم</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Transparency & Audit */}
                    <div className="lg:col-span-4">
                        <Card title="نبض العمليات (Live Audit)">
                            <div className="space-y-6 pt-4">
                                {[
                                    { act: "اعتماد درجات", user: "وكيل تعليمي", time: "10:30" },
                                    { act: "تعديل حضور", user: "وكيل طلاب", time: "09:15" },
                                    { act: "إضافة تعميم", user: "سكرتير", time: "08:00" },
                                ].map((log, i) => (
                                    <div key={i} className="flex items-start gap-4 border-r-2 border-primary/30 pr-4">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-text-primary">{log.act}</p>
                                            <p className="text-[10px] text-text-secondary font-bold uppercase">{log.user}</p>
                                        </div>
                                        <span className="text-[10px] text-text-secondary font-mono">{log.time}</span>
                                    </div>
                                ))}
                                <button className="w-full text-center text-[10px] font-bold text-primary hover:text-accent uppercase tracking-widest pt-4 border-t border-border-subtle transition-colors">
                                    عرض السجل الكامل ←
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Sentinel Integrity Radar (Hardening Layer) */}
                <div className="mb-10">
                    <SentinelDashboard />
                </div>

                {/* Organization Hub */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-text-inverse">
                        <span className="w-2 h-8 bg-primary rounded-full"></span>
                        الهيكل التنظيمي والتشغيل الرقمي
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { href: "/principal/analytics/secretary", title: "السكرتارية", desc: "المعاملات والإجازات والطلبات.", color: "primary" },
                            { href: "/principal/analytics/student-affairs", title: "شؤون الطلاب", desc: "الغياب، السلوك، والقضايا.", color: "accent" },
                            { href: "/principal/analytics/academic", title: "الشؤون التعليمية", desc: "المنهج والتحصيل الأكاديمي.", color: "emerald" },
                            { href: "/qa", title: "منسق الجودة", desc: "مؤشرات الأداء والتدقيق.", color: "rose" },
                            { href: "/meetings", title: "الاجتماعات", desc: "جدولة الاجتماعات وتوقيع المحاضر الرسمية.", color: "primary" },
                            { href: "/workflows", title: "الموافقات المعلّقة", desc: "مسارات العمل وبوابات الموافقة المُسنَدة إليك.", color: "accent" },
                            { href: "/staff-evaluation", title: "تقييمات الأداء", desc: "تقييم وتطوير الكفاءات — ISO 9.1.3.", color: "primary" },
                            { href: "/period-attendance", title: "حضور الحصص", desc: "تسجيل الحضور على مستوى كل حصة دراسية.", color: "accent" },
                            { href: "/student-affairs/attendance", title: "الحضور اليومي", desc: "تسجيل الحضور اليومي للطلاب والغيابات.", color: "primary" },
                            { href: "/principal/analytics/lrc", title: "رادار المكتبة", desc: "حركة الاستعارة ونشاط القراءة.", color: "primary" },
                            { href: "/principal/analytics/lab", title: "مراقبة المختبر", desc: "التجارب المنفذة وإشغال المعامل.", color: "accent" },
                            { href: "/principal/analytics/health", title: "المؤشرات الصحية", desc: "سجل العيادة والبيئة المدرسية.", color: "rose" },
                            { href: "/principal/analytics/counselor", title: "التوجيه الطلابي", desc: "تحليل الحالات والمعالجات.", color: "primary" },
                        ].map((item, idx) => (
                            <Link key={idx} href={item.href}>
                                <div className="surface-block p-6 hover:-translate-y-1 transition-all cursor-pointer group hover:border-primary/50">
                                    <h4 className="font-bold text-primary mb-2 group-hover:text-accent transition-colors">{item.title}</h4>
                                    <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                                </div>
                            </Link>
                        ))}
                        <div onClick={() => setIsClassNavigatorOpen(true)}>
                            <div className="surface-block p-6 border-primary/30 bg-primary/10 hover:bg-primary/20 cursor-pointer h-full transition-all group">

                                <h4 className="font-bold text-primary mb-2">إدارة الفصول (4-6)</h4>
                                <p className="text-xs text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">تحليل شخصية الفصل وتوافق المعلمين.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Academic Performance Monitoring */}
                <section className="mb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card title="مراقبة التحصيل الأكاديمي">
                            <div className="space-y-6 pt-4">
                                {[
                                    { label: "الصف الرابع", val: 89, color: "bg-primary" },
                                    { label: "الصف الخامس", val: 92, color: "bg-primary" },
                                    { label: "الصف السادس", val: 85, color: "bg-accent" },
                                ].map((row, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                                            <span className="text-text-secondary">{row.label}</span>
                                            <span className={row.color.replace('bg-', 'text-')}>{row.val}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-bg-surface/30 rounded-full overflow-hidden">
                                            <div className={`h-full ${row.color} rounded-full transition-all duration-1000`} style={{ width: `${row.val}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="تفعيل التقنية والمصادر">
                            <div className="space-y-8 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-text-primary">زيارات المكتبة</p>
                                            <p className="text-[10px] text-text-secondary">
                                                {kpisLoading ? '...' : `${kpis?.lrc_visits_today ?? '--'} زيارة اليوم`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-primary text-xs font-bold">+15%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                                            <Microscope className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-text-primary">زيارات المختبر</p>
                                            <p className="text-[10px] text-text-secondary">8 زيارات أسبوعية</p>
                                        </div>
                                    </div>
                                    <span className="text-primary text-xs font-bold">+5%</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="كفاءة تفاعل الحصص">
                            <div className="text-center py-6">
                                <h4 className="text-5xl font-black text-primary">88%</h4>
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-4">متوسط التفاعل الصفي</p>
                                <div className="mt-8 flex justify-center gap-6 border-t border-border-subtle pt-8">
                                    <div className="text-center">
                                        <p className="text-primary font-bold text-lg">420</p>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">تعزيز</p>
                                    </div>
                                    <div className="text-center border-x border-border-subtle px-6">
                                        <p className="text-destructive font-bold text-lg">12</p>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">تنبيه</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-primary font-bold text-lg">94%</p>
                                        <p className="text-[10px] text-text-secondary font-bold uppercase">انضباط</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>

            </div>

            <DisciplineKnightsModal
                isOpen={isKnightsOpen}
                onClose={() => setIsKnightsOpen(false)}
                userRole="school_principal"
            />
            <ClassNavigatorModal
                isOpen={isClassNavigatorOpen}
                onClose={() => setIsClassNavigatorOpen(false)}
                classes={classes}
            />
        </main>
    );
}
