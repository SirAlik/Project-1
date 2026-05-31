"use client";

import React, { useState, useEffect } from "react";
import { ar } from "@/lib/i18n/ar";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import {
    ShieldAlert,
    TrendingUp,
    Users,
    ClipboardCheck,
    AlertTriangle,
    Clock,
    Fingerprint,
    Zap,
    Maximize2,
    BookOpen
} from "lucide-react";
import { StudentProfile, StudentAttendance, BehavioralReferral } from "@/lib/types/student-affairs";
import { DeepDiveModal } from "./DeepDiveModal";

interface DashboardProps {
    students: StudentProfile[];
    attendance: StudentAttendance[];
    referrals: BehavioralReferral[];
    stats: {
        totalAbsent: number;
        totalLate: number;
        pendingReferrals: number;
        issuedAssets: number;
    };
    role: "vp" | "counselor";
}

export function StudentAffairsDashboard({ students, attendance, referrals, stats, role }: DashboardProps) {
    const [currentStatIndex, setCurrentStatIndex] = useState(0);
    const [deepDiveOpen, setDeepDiveOpen] = useState(false);
    const [deepDiveType, setDeepDiveType] = useState<"lateness" | "absence" | "neighborhood" | "weekday">("lateness");

    const openDeepDive = (type: typeof deepDiveType) => {
        setDeepDiveType(type);
        setDeepDiveOpen(true);
    };

    const rotatingStats = [
        { label: ar.kpi.attendanceRate, value: `${Math.round(((students.length - stats.totalAbsent) / (students.length || 1)) * 100)}%`, color: "indigo" },
        { label: ar.kpi.totalLate, value: stats.totalLate.toString(), color: "amber" },
        ...(role === 'counselor' ? [
            { label: ar.kpi.pendingReferrals, value: stats.pendingReferrals.toString(), color: "rose" },
        ] : []),
        { label: ar.kpi.atRiskStudents, value: students.filter(s => attendance.filter(a => a.student_id === s.id && a.status === 'late').length >= 3).length.toString(), color: "rose" },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStatIndex(prev => (prev + 1) % rotatingStats.length);
        }, 10000);
        return () => clearInterval(interval);
    }, [rotatingStats.length]);

    const latenessQueue = attendance.filter(a => a.status === 'late').map(a => ({
        ...a,
        studentName: students.find(s => s.id === a.student_id)?.name || "غير معروف",
        minutesLate: a.time_in ? calculateMinutesLate(a.time_in) : 0
    }));

    const disciplineTrends = [
        { name: "تأخر", count: referrals.filter(r => r.referral_type === 'lateness').length },
        { name: "غياب", count: referrals.filter(r => r.referral_type === 'absence').length },
        { name: "سلوك", count: referrals.filter(r => r.referral_type === 'behavior').length },
        { name: "أكاديمي", count: referrals.filter(r => r.referral_type === 'academic').length },
    ];

    const atRiskStudents = students.map(s => {
        const studentAttendance = attendance.filter(a => a.student_id === s.id);
        const lateCount = studentAttendance.filter(a => a.status === 'late').length;
        const absentCount = studentAttendance.filter(a => a.status === 'absent').length;
        return { ...s, riskScore: lateCount + (absentCount * 2), lateCount, absentCount };
    }).filter(s => s.riskScore >= 3).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

    const currentStat = rotatingStats[currentStatIndex];

    return (
        <>
            <DeepDiveModal isOpen={deepDiveOpen} onClose={() => setDeepDiveOpen(false)} students={students} attendance={attendance} type={deepDiveType} />
            <div className="space-y-8 animate-in fade-in duration-700" dir="rtl">
                {/* Rotating Stats Hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20 rounded-[3rem] p-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.1),transparent_50%)]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <Zap className="w-5 h-5 text-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{ar.widgets.rotatingStats}</span>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground mb-2">{currentStat.label}</p>
                            <h1 className="text-6xl font-black italic text-foreground">{currentStat.value}</h1>
                        </div>
                        <div className="flex gap-2">
                            {rotatingStats.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentStatIndex ? 'bg-primary scale-125' : 'bg-muted'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard title={ar.kpi.attendanceRate} value={`${Math.round(((students.length - stats.totalAbsent) / (students.length || 1)) * 100)}%`} icon={Users} color="indigo" />
                    <KPICard title={ar.kpi.totalAbsent} value={stats.totalAbsent.toString()} icon={ShieldAlert} color="rose" />
                    <KPICard title={ar.kpi.totalLate} value={stats.totalLate.toString()} icon={TrendingUp} color="amber" />
                    {role === 'counselor' ? (
                        <KPICard title={ar.kpi.pendingReferrals} value={stats.pendingReferrals.toString()} icon={AlertTriangle} color="indigo" />
                    ) : (
                        <KPICard title="إجمالي العهد" value={stats.issuedAssets.toString()} icon={BookOpen} color="indigo" />
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lateness Processing Queue */}
                    <div className="lg:col-span-1 bg-card/50 border border-warning/20 rounded-[2.5rem] p-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-warning mb-6 flex items-center gap-2">
                            <Fingerprint className="w-4 h-4" /> {ar.widgets.liveGateFeed}
                        </h3>
                        <div className="space-y-3 max-h-72 overflow-y-auto">
                            {latenessQueue.map(item => (
                                <div key={item.id} className="group flex items-center justify-between p-4 bg-background/70 border border-border rounded-2xl hover:border-warning/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-warning" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-foreground">{item.studentName}</div>
                                            <div className="text-[10px] text-muted-foreground">بصمة: {item.time_in}</div>
                                        </div>
                                    </div>
                                    <span className="bg-warning/10 text-warning px-3 py-1 rounded-lg text-[10px] font-black">+{item.minutesLate} د</span>
                                </div>
                            ))}
                            {latenessQueue.length === 0 && <div className="text-center py-10 text-muted-foreground italic text-sm">لا يوجد متأخرين</div>}
                        </div>
                    </div>

                    {/* Discipline Trends */}
                    <div className="lg:col-span-2 bg-card/50 border border-border rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-success" /> {ar.widgets.disciplineTrends}
                            </h3>
                            <button onClick={() => openDeepDive("lateness")} className="p-2 hover:bg-muted rounded-xl transition-colors" aria-label="توسيع إحصائيات التأخر">
                                <Maximize2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <ChartContainer height={256}>
                            <BarChart data={disciplineTrends}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                <Bar dataKey="count" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Risk Radar */}
                    <div className="bg-card/50 border border-border rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> {ar.widgets.riskRadar}
                            </h3>
                            <button onClick={() => openDeepDive("neighborhood")} className="p-2 hover:bg-muted rounded-xl transition-colors" aria-label="توسيع رادار الخطر">
                                <Maximize2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {atRiskStudents.map(student => (
                                <div key={student.id} className="group flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-2xl hover:border-destructive/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive font-black text-xs">!</div>
                                        <div>
                                            <div className="text-xs font-black">{student.name}</div>
                                            <div className="text-[10px] text-muted-foreground">خطورة: {student.riskScore}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-[10px]">
                                        <span className="bg-warning/10 text-warning px-2 py-1 rounded-lg">تأخر: {student.lateCount}</span>
                                        <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-lg">غياب: {student.absentCount}</span>
                                    </div>
                                </div>
                            ))}
                            {atRiskStudents.length === 0 && <div className="text-center py-10 text-muted-foreground italic text-sm">لا يوجد طلاب في منطقة الخطر</div>}
                        </div>
                    </div>

                    {/* Action Stream */}
                    <div className="bg-card/50 border border-border rounded-[2.5rem] p-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4" /> {ar.widgets.actionStream}
                        </h3>
                        <div className="space-y-4">
                            {role === 'counselor' && (
                                <ActionItem label="مراجعة الإحالات المعلقة" count={stats.pendingReferrals} urgent={stats.pendingReferrals > 5} />
                            )}
                            <ActionItem label="توقيع نماذج استلام العهد" count={stats.issuedAssets} />
                            <ActionItem label="تجهيز سجلات الغياب للطباعة" status="جاهز" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function calculateMinutesLate(timeIn: string): number {
    const [h, m] = timeIn.split(':').map(Number);
    const threshold = 7 * 60 + 15;
    const arrival = h * 60 + m;
    return Math.max(0, arrival - threshold);
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
    const colorMap: Record<string, string> = {
        indigo: "from-primary/10 to-primary/5 border-primary/20 text-primary",
        rose: "from-destructive/10 to-destructive/5 border-destructive/20 text-destructive",
        amber: "from-warning/10 to-warning/5 border-warning/20 text-warning",
    };
    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} border p-8 rounded-[2.5rem]`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-background/50 rounded-2xl border border-border/5"><Icon className="w-5 h-5" /></div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60 text-muted-foreground">{title}</p>
            <h2 className="text-3xl font-black italic">{value}</h2>
        </div>
    );
}

function ActionItem({ label, count, status, urgent }: { label: string; count?: number; status?: string; urgent?: boolean }) {
    return (
        <div className={`flex items-center justify-between p-4 bg-background/50 border ${urgent ? 'border-destructive/30' : 'border-border/50'} rounded-2xl`}>
            <div className="text-xs font-bold text-foreground/80">{label}</div>
            <div className="flex items-center gap-2">
                {count !== undefined && <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${urgent ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
                {status && <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-success/10 text-success">{status}</span>}
                <div className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-destructive animate-pulse' : 'bg-muted'}`} />
            </div>
        </div>
    );
}
