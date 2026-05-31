"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, AreaChart, Area
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import {
    User, Star, AlertTriangle, Clock, TrendingUp, BookOpen,
    MessageSquare, Calendar, Share2, Printer, Trophy, Microscope
} from "lucide-react";
import { AbsenceModal } from "@/components/parent/AbsenceModal";
import { CounselorModal } from "@/components/parent/CounselorModal";
import { StudentAffairsModal } from "@/components/parent/StudentAffairsModal";
import { ShieldAlert, HeartPulse } from "lucide-react";
import { HealthSocialModal } from "@/components/parent/HealthSocialModal";
import { AIExplainButton } from "@/components/ui/AIExplainButton";

// Mock Data
const PERFORMANCE_TREND = [
    { name: "أسبوع 1", level: 65, average: 75 },
    { name: "أسبوع 2", level: 78, average: 76 },
    { name: "أسبوع 3", level: 72, average: 77 },
    { name: "أسبوع 4", level: 85, average: 78 },
    { name: "أسبوع 5", level: 88, average: 79 },
];

const SUBJECT_ANALYSIS = [
    { subject: "العلوم", score: 95, fullMark: 100 },
    { subject: "الرياضيات", score: 82, fullMark: 100 },
    { subject: "لغتي", score: 88, fullMark: 100 },
    { subject: "الدين", score: 92, fullMark: 100 },
    { subject: "الاجتماعيات", score: 75, fullMark: 100 },
];

export default function ParentDashboardPage() {
    const params = useParams();
    const studentId = params?.studentId;
    const [modals, setModals] = useState({ absence: false, counselor: false, studentAffairs: false, healthSocial: false });

    return (
        <main className="min-h-screen bg-background text-foreground p-6 md:p-8" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent p-[1px]">
                            <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center border border-border">
                                <User className="w-10 h-10 text-primary-foreground" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-muted-foreground text-sm">الملف الشخصي للطالب</span>
                                <Pill className="bg-success/10 text-success border-success/20">نشط</Pill>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                                أحمد علي محمد
                                <span className="text-sm font-normal text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border">
                                    ID: {studentId}
                                </span>
                            </h1>
                            <p className="text-muted-foreground mt-1">الصف الخامس - فصل 5/1</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-secondary-foreground">
                            <Printer className="w-4 h-4" /> تقرير PDF
                        </button>
                        <button
                            onClick={() => setModals(prev => ({ ...prev, counselor: true }))}
                            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                        >
                            <MessageSquare className="w-4 h-4" /> مراسلة الموجه
                        </button>
                        <button
                            onClick={() => setModals(prev => ({ ...prev, healthSocial: true }))}
                            className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                        >
                            <HeartPulse className="w-4 h-4" /> تحديث الحالة
                        </button>
                        <button
                            onClick={() => setModals(prev => ({ ...prev, studentAffairs: true }))}
                            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all"
                        >
                            <ShieldAlert className="w-4 h-4" /> مراسلة الوكيل
                        </button>
                    </div>
                </header>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatBox icon={<Star className="text-accent" />} label="نجوم الأسبوع" value="42" color="accent" metricId="weekly_stars" />
                    <StatBox icon={<AlertTriangle className="text-destructive" />} label="مخالفات سلوكية" value="0" color="destructive" metricId="behavior_issues" />
                    <StatBox icon={<TrendingUp className="text-primary" />} label="المستوى العام" value="92%" color="primary" metricId="overall_level" />
                    <StatBox icon={<Calendar className="text-primary" />} label="أيام الغياب" value="1" color="primary" metricId="absent_days" />
                </div>

                <div className="grid lg:grid-cols-12 gap-6">

                    {/* Main Analytics Column */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Advanced Trend Analytics */}
                        <Card className="p-6 border-border bg-card">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-primary" />
                                            التحليل المقارن للمستوى
                                        </h3>
                                        <AIExplainButton metricId="performance_trend" metricTitle="التحليل المقارن للمستوى" value="88%" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">مقارنة أداء الطالب مع متوسط الفصل</p>
                                </div>
                                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0">
                                    {['أسبوعي', 'شهري', 'فصلي'].map((t) => (
                                        <button key={t} className={`px-4 py-1.5 text-xs rounded-md transition-all ${t === 'أسبوعي' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <ChartContainer height={300}>
                                <AreaChart data={PERFORMANCE_TREND}>
                                    <defs>
                                        <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '12px', color: 'hsl(var(--popover-foreground))' }}
                                        itemStyle={{ fontSize: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="level" name="مستوى الطالب" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorLevel)" />
                                    <Line type="monotone" dataKey="average" name="متوسط الفصل" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                                </AreaChart>
                            </ChartContainer>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Subject Analysis */}
                            <Card className="p-6 border-border bg-card">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-success" />
                                    تحليل المواد الدراسية
                                </h3>
                                <ChartContainer height={250}>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={SUBJECT_ANALYSIS}>
                                        <PolarGrid stroke="hsl(var(--border))" />
                                        <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <Radar name="الدرجة" dataKey="score" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.5} />
                                    </RadarChart>
                                </ChartContainer>
                            </Card>

                            {/* Discipline & Bathroom Tracker */}
                            <Card className="p-6 border-border bg-card">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-destructive" />
                                    سجل الانضباط اليومي
                                </h3>
                                <div className="space-y-4">
                                    <LogItem label="دورة المياه" value="2 مرتين (12 دقيقة)" icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
                                    <LogItem label="التأخر عن الحصة" value="0 مرات" icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />} />
                                    <LogItem label="المشاركة الصفية" value="ممتاز (9/10)" icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />} />
                                </div>
                                <div className="mt-8 pt-6 border-t border-border">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground font-bold">الغيابات</span>
                                        <div className="flex gap-2">
                                            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold">بعذر: 2</span>
                                            <span className="bg-destructive/10 text-destructive px-2.5 py-1 rounded-lg text-[10px] font-bold">بدون: 1</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Enrichment Activity & Comparison */}
                        <Card className="p-6 border-border bg-card">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-warning" />
                                            النشاط الإثرائي والتردد اليومي
                                        </h3>
                                        <AIExplainButton metricId="enrichment_activity" metricTitle="النشاط الإثرائي" value="مرتفع" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">سجل زيارات المكتبة والمختبر العلمي</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-warning/10 text-warning px-2 py-1 rounded-full font-bold">
                                        ترتيب الطالب: 5# من أصل 24
                                    </span>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-primary" /> معدل الاستعارة (مقارنة)
                                    </h4>
                                    <ChartContainer height={200} className="text-right">
                                        <AreaChart data={[
                                            { name: "شهر 1", student: 2, avg: 1.5 },
                                            { name: "شهر 2", student: 4, avg: 1.8 },
                                            { name: "شهر 3", student: 3, avg: 2.1 },
                                            { name: "شهر 4", student: 6, avg: 2.3 },
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }} />
                                            <Area type="monotone" dataKey="student" name="استعارات الابن" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.1} />
                                            <Area type="monotone" dataKey="avg" name="متوسط الطلاب" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" fill="transparent" />
                                        </AreaChart>
                                    </ChartContainer>
                                    <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl text-[10px] text-accent italic">
                                        * ابنك يقرأ بمعدل أعلى من متوسط زملائه بنسبة 15%. استمر في تحفيزه!
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Microscope className="w-4 h-4 text-success" /> سجل المختبر العلمي
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl border border-border bg-muted/50">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-foreground">تجربة: حالات المادة</span>
                                                <span className="text-[10px] text-muted-foreground">منذ يومين</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">تطبيق عملي في المختبر - المعلم: بندر السيف</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-border bg-muted/50">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-foreground">درس: الخلية النباتية</span>
                                                <span className="text-[10px] text-muted-foreground">الأسبوع الماضي</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">استخدام المجهر الضوئي لرؤية الخلايا</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar Column */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Administrative Log */}
                        <Card className="p-6 border-border bg-card">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-primary" />
                                السجل الإداري
                            </h3>
                            <div className="space-y-6 relative before:absolute before:right-[18px] before:top-2 before:bottom-0 before:w-[1px] before:bg-border">
                                <TimelineItem title="زيارة الموجه الطلابي" desc="مناقشة الخطة الدراسية" time="8 يناير 2024" />
                                <TimelineItem title="تحويل لوكيل شؤون الطلاب" desc="إذن خروج اضطراري" time="5 يناير 2024" variant="blue" />
                                <TimelineItem title="تحديث السجل الطبي" desc="حالة صحية مستقرة" time="2 يناير 2024" variant="emerald" />
                            </div>
                        </Card>

                        {/* Absence Reporting (Ticketing) */}
                        <Card className="p-6 border border-accent/20 bg-accent/5">
                            <h3 className="text-lg font-bold mb-2">طلب بلاغ غياب</h3>
                            <p className="text-xs text-muted-foreground mb-6">يمكنك رفع بلاغ غياب بعذر ليتم النظر فيه من قبل الوكيل.</p>
                            <div className="space-y-4">
                                <div className="p-3 bg-card rounded-xl border border-border text-xs flex justify-between items-center group cursor-pointer hover:border-accent transition-colors">
                                    <span className="text-foreground">بلاغ غياب ليوم الأحد القادم</span>
                                    <span className="bg-warning/10 text-warning px-2 py-0.5 rounded text-[10px] font-bold">قيد المراجعة</span>
                                </div>
                                <button
                                    onClick={() => setModals(prev => ({ ...prev, absence: true }))}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-sm shadow-lg transition-all"
                                >
                                    إنشاء طلب جديد
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <AbsenceModal isOpen={modals.absence} onClose={() => setModals(prev => ({ ...prev, absence: false }))} />
            <CounselorModal isOpen={modals.counselor} onClose={() => setModals(prev => ({ ...prev, counselor: false }))} />
            <StudentAffairsModal isOpen={modals.studentAffairs} onClose={() => setModals(prev => ({ ...prev, studentAffairs: false }))} />
            <HealthSocialModal
                isOpen={modals.healthSocial}
                onClose={() => setModals(prev => ({ ...prev, healthSocial: false }))}
                studentId={studentId as string}
            />
        </main>
    );
}

function StatBox({ icon, label, value, metricId }: { icon: React.ReactNode; label: string; value: string; color?: string; metricId?: string }) {
    return (
        <Card className="p-6 border-border bg-card flex flex-col items-center text-center group hover:border-primary/30 transition-all relative">
            {metricId && (
                <div className="absolute top-2 right-2">
                    <AIExplainButton metricId={metricId} metricTitle={label} value={value} />
                </div>
            )}
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center border border-border mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <p className="text-muted-foreground text-xs mb-1 font-bold">{label}</p>
            <p className="text-2xl font-black">{value}</p>
        </Card>
    )
}

function LogItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-center gap-3">
                {icon}
                <span className="text-xs text-muted-foreground font-bold">{label}</span>
            </div>
            <span className="text-xs font-bold text-foreground">{value}</span>
        </div>
    )
}

function TimelineItem({ title, desc, time, variant = 'violet' }: { title: string; desc: string; time: string; variant?: string }) {
    const colors: Record<string, string> = {
        violet: 'bg-accent',
        blue: 'bg-primary',
        emerald: 'bg-primary'
    };
    return (
        <div className="relative pr-10" dir="rtl">
            <div className={`absolute right-3 top-2 w-[12px] h-[12px] rounded-full border-2 border-background z-10 ${colors[variant] || 'bg-accent'}`} />
            <div>
                <h4 className="text-sm font-bold text-foreground">{title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold text-left">{time}</p>
            </div>
        </div>
    )
}
