"use client";

import { useState, useEffect } from "react";
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
import { DashboardGrid, MetricCard, DashboardSection } from "@/components/dashboard";

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

    const attendanceRate = `${Math.round(((students.length - stats.totalAbsent) / (students.length || 1)) * 100)}%`;

    const rotatingStats = [
        { label: ar.kpi.attendanceRate, value: attendanceRate },
        { label: ar.kpi.totalLate, value: stats.totalLate.toString() },
        ...(role === 'counselor' ? [
            { label: ar.kpi.pendingReferrals, value: stats.pendingReferrals.toString() },
        ] : []),
        { label: ar.kpi.atRiskStudents, value: students.filter(s => attendance.filter(a => a.student_id === s.id && a.status === 'late').length >= 3).length.toString() },
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
            <div className="space-y-6" dir="rtl">
                {/* مؤشّر متناوب (قيم حقيقية محسوبة) */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{ar.widgets.rotatingStats}</span>
                            </div>
                            <p className="text-sm font-bold text-muted-foreground">{currentStat.label}</p>
                            <p className="mt-1 text-4xl font-black tabular-nums text-foreground">{currentStat.value}</p>
                        </div>
                        <div className="flex gap-2">
                            {rotatingStats.map((_, i) => (
                                <span key={i} className={`h-2 w-2 rounded-full transition-all ${i === currentStatIndex ? 'scale-125 bg-primary' : 'bg-muted'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <DashboardGrid cols={4}>
                    <MetricCard label={ar.kpi.attendanceRate} value={attendanceRate} icon={Users} tone="primary" />
                    <MetricCard label={ar.kpi.totalAbsent} value={stats.totalAbsent.toString()} icon={ShieldAlert} tone="danger" />
                    <MetricCard label={ar.kpi.totalLate} value={stats.totalLate.toString()} icon={TrendingUp} tone="warning" />
                    {role === 'counselor' ? (
                        <MetricCard label={ar.kpi.pendingReferrals} value={stats.pendingReferrals.toString()} icon={AlertTriangle} tone="info" />
                    ) : (
                        <MetricCard label="إجمالي العهد" value={stats.issuedAssets.toString()} icon={BookOpen} tone="info" />
                    )}
                </DashboardGrid>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Lateness Processing Queue */}
                    <DashboardSection title={ar.widgets.liveGateFeed} icon={Fingerprint} className="lg:col-span-1">
                        <div className="max-h-72 space-y-3 overflow-y-auto">
                            {latenessQueue.map(item => (
                                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft p-4 transition-colors hover:border-warning/30">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                                            <Clock className="h-5 w-5 text-warning" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-foreground">{item.studentName}</div>
                                            <div className="text-[10px] text-muted-foreground">بصمة: {item.time_in}</div>
                                        </div>
                                    </div>
                                    <span className="rounded-lg bg-warning/10 px-3 py-1 text-[10px] font-black text-warning">+{item.minutesLate} د</span>
                                </div>
                            ))}
                            {latenessQueue.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">لا يوجد متأخرين</div>}
                        </div>
                    </DashboardSection>

                    {/* Discipline Trends */}
                    <DashboardSection
                        title={ar.widgets.disciplineTrends}
                        icon={TrendingUp}
                        className="lg:col-span-2"
                        action={
                            <button onClick={() => openDeepDive("lateness")} className="rounded-xl p-2 transition-colors hover:bg-muted" aria-label="توسيع إحصائيات التأخر">
                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                        }
                    >
                        <ChartContainer height={256}>
                            <BarChart data={disciplineTrends}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={{ background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                                <Bar dataKey="count" fill="var(--primary)" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ChartContainer>
                    </DashboardSection>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Risk Radar */}
                    <DashboardSection
                        title={ar.widgets.riskRadar}
                        icon={ShieldAlert}
                        action={
                            <button onClick={() => openDeepDive("neighborhood")} className="rounded-xl p-2 transition-colors hover:bg-muted" aria-label="توسيع رادار الخطر">
                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                        }
                    >
                        <div className="space-y-4">
                            {atRiskStudents.map(student => (
                                <div key={student.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-soft p-4 transition-colors hover:border-destructive/30">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-xs font-black text-destructive">!</div>
                                        <div>
                                            <div className="text-xs font-black text-foreground">{student.name}</div>
                                            <div className="text-[10px] text-muted-foreground">خطورة: {student.riskScore}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 text-[10px]">
                                        <span className="rounded-lg bg-warning/10 px-2 py-1 text-warning">تأخر: {student.lateCount}</span>
                                        <span className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive">غياب: {student.absentCount}</span>
                                    </div>
                                </div>
                            ))}
                            {atRiskStudents.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">لا يوجد طلاب في منطقة الخطر</div>}
                        </div>
                    </DashboardSection>

                    {/* Action Stream */}
                    <DashboardSection title={ar.widgets.actionStream} icon={ClipboardCheck}>
                        <div className="space-y-4">
                            {role === 'counselor' && (
                                <ActionItem label="مراجعة الإحالات المعلقة" count={stats.pendingReferrals} urgent={stats.pendingReferrals > 5} />
                            )}
                            <ActionItem label="توقيع نماذج استلام العهد" count={stats.issuedAssets} />
                            <ActionItem label="تجهيز سجلات الغياب للطباعة" status="جاهز" />
                        </div>
                    </DashboardSection>
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

function ActionItem({ label, count, status, urgent }: { label: string; count?: number; status?: string; urgent?: boolean }) {
    return (
        <div className={`flex items-center justify-between rounded-2xl border bg-surface-soft p-4 ${urgent ? 'border-destructive/30' : 'border-border'}`}>
            <div className="text-xs font-bold text-foreground">{label}</div>
            <div className="flex items-center gap-2">
                {count !== undefined && <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${urgent ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
                {status && <span className="rounded-lg bg-success/10 px-2 py-1 text-[10px] font-black text-success">{status}</span>}
                <div className={`h-1.5 w-1.5 rounded-full ${urgent ? 'bg-destructive' : 'bg-muted'}`} />
            </div>
        </div>
    );
}
