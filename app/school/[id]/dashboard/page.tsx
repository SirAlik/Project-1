import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Users, GraduationCap, CalendarCheck,
    UserPlus, KeyRound, Layers, AlertTriangle, TrendingUp,
    Database, ArrowRight, RefreshCw, Building2,
    BarChart3, Inbox, Upload
} from "lucide-react";
import { getCachedSchoolStats, validateSchoolAccess } from "@/lib/dashboard-data";
import { IdentityStrip } from "@/components/ui/IdentityStrip";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SchoolCoordinatorDashboard({ params }: PageProps) {
    const { id: schoolId } = await params;

    // Security: Validate school access
    const { valid } = await validateSchoolAccess(schoolId);

    if (!valid) {
        // Redirect to portal if user doesn't have access to this school
        redirect('/portal');
    }

    // Fetch school-scoped stats
    const stats = await getCachedSchoolStats(schoolId);

    const quickActions = [
        { label: "استيراد البيانات", icon: <Upload size={20} />, href: `/school/${schoolId}/setup`, color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
        { label: "إضافة طالب", icon: <UserPlus size={20} />, href: `/school/${schoolId}/students/new`, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
        { label: "إضافة موظف", icon: <GraduationCap size={20} />, href: `/school/${schoolId}/staff/new`, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
        { label: "إعادة تعيين كلمات المرور", icon: <KeyRound size={20} />, href: `/school/${schoolId}/reset-passwords`, color: "bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))] dark:text-[hsl(var(--gold))] border-[hsla(var(--gold),.25)]" },
        { label: "إدارة الفصول", icon: <Layers size={20} />, href: `/school/${schoolId}/classroom`, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    ];

    return (
        <div className="min-h-screen text-foreground p-6" dir="rtl">
            {/* Context Banner */}
            <IdentityStrip role="school_admin" schoolName={stats.schoolName} />

            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                    <Building2 size={28} className="text-primary" />
                    <h1 className="text-3xl font-black">لوحة تحكم المدرسة</h1>
                </div>
                <p className="text-muted-foreground opacity-80">إدارة شاملة لبيانات ومستخدمي المدرسة</p>
            </div>

            {/* Stats Cards - REAL DATA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    label="إجمالي الطلاب"
                    value={stats.totalStudents}
                    icon={<Users size={24} />}
                    color="bg-blue-500"
                />
                <StatCard
                    label="إجمالي المعلمين"
                    value={stats.totalTeachers}
                    icon={<GraduationCap size={24} />}
                    color="bg-emerald-500"
                />
                <Link href={`/school/${schoolId}/staff`} className="block group cursor-pointer">
                    <StatCard
                        label="إجمالي الموظفين"
                        value={stats.totalStaff}
                        icon={<Users size={24} />}
                        color="bg-purple-500"
                    />
                </Link>
                <StatCard
                    label="الحضور اليومي"
                    value={0}
                    suffix="%"
                    icon={<CalendarCheck size={24} />}
                    color="bg-[hsl(var(--gold))]"
                    placeholder="قريباً"
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ArrowRight size={20} className="text-primary" />
                    إجراءات سريعة
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {quickActions.map((action, i) => (
                        <Link
                            key={i}
                            href={action.href}
                            className={`p-4 rounded-2xl border ${action.color} flex flex-col items-center gap-3 hover:scale-105 transition-transform bg-card hover:bg-muted/50`}
                        >
                            {action.icon}
                            <span className="text-sm font-bold text-card-foreground">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Decision Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Trend - Placeholder */}
                <div className="lg:col-span-2 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-primary" />
                        معدل الحضور - آخر 7 أيام
                    </h3>
                    <div className="h-[200px] flex items-center justify-center rounded-xl bg-muted/20 border border-dashed border-border">
                        <div className="text-center">
                            <BarChart3 size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                            <p className="text-sm font-bold opacity-60 text-muted-foreground">لا توجد بيانات حضور متاحة</p>
                            <p className="text-xs opacity-40 mt-1 text-muted-foreground">سيتم عرض الإحصائيات عند تسجيل بيانات الحضور</p>
                        </div>
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-[hsl(var(--gold))]" />
                        تنبيهات مبكرة
                    </h3>
                    <div className="space-y-3">
                        {stats.totalStudents === 0 && stats.totalTeachers === 0 ? (
                            <div className="p-3 rounded-xl text-sm font-medium flex items-start gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Inbox size={14} className="mt-0.5 flex-shrink-0" />
                                لا توجد بيانات مسجلة بعد. ابدأ بإضافة المعلمين والطلاب.
                            </div>
                        ) : stats.totalTeachers === 0 ? (
                            <div className="p-3 rounded-xl text-sm font-medium flex items-start gap-2 bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))] dark:text-[hsl(var(--gold))] border border-[hsla(var(--gold),.25)]">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                لا يوجد معلمون مسجلون في هذه المدرسة
                            </div>
                        ) : stats.totalStudents === 0 ? (
                            <div className="p-3 rounded-xl text-sm font-medium flex items-start gap-2 bg-[hsla(var(--gold),.15)] text-[hsl(var(--gold))] dark:text-[hsl(var(--gold))] border border-[hsla(var(--gold),.25)]">
                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                لا يوجد طلاب مسجلون في هذه المدرسة
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl text-sm font-medium flex items-start gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CalendarCheck size={14} className="mt-0.5 flex-shrink-0" />
                                لا توجد تنبيهات حالياً
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Quality Widget */}
            <div className="mt-6 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Database size={18} className="text-purple-500" />
                    ملخص البيانات
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{stats.totalStudents}</p>
                        <p className="text-xs font-bold opacity-60 text-muted-foreground">طالب مسجل</p>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.totalTeachers}</p>
                        <p className="text-xs font-bold opacity-60 text-muted-foreground">معلم مسجل</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums">{stats.totalStaff}</p>
                        <p className="text-xs font-bold opacity-60 text-muted-foreground">موظف إداري</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity - Placeholder */}
            <div className="mt-6 bg-card p-6 rounded-[2rem] border border-border shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <RefreshCw size={18} className="text-primary" />
                    النشاط الأخير
                </h3>
                <div className="h-[100px] flex items-center justify-center">
                    <div className="text-center">
                        <Inbox size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm font-bold opacity-60 text-muted-foreground">لا يوجد نشاط حديث</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    suffix = '',
    placeholder
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    suffix?: string;
    placeholder?: string;
}) {
    return (
        <div className="bg-card p-6 rounded-[2rem] border border-border relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute -right-6 -top-6 w-20 h-20 ${color} rounded-full blur-3xl opacity-10`} />
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl ${color}/10 flex items-center justify-center mb-4 text-foreground`}>
                    <span className={color.replace('bg-', 'text-')}>{icon}</span>
                </div>
                {placeholder ? (
                    <p className="text-xl font-bold text-muted-foreground/40">{placeholder}</p>
                ) : (
                    <p className="text-3xl font-black tabular-nums text-foreground">{value.toLocaleString('en-US')}{suffix}</p>
                )}
                <p className="text-xs font-bold opacity-60 mt-1 text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}
