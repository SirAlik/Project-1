import React from "react";
import Link from "next/link";
import {
    School,
    Users,
    GraduationCap,
    Activity,
    TrendingUp,
    AlertTriangle,
    Bell,
    Shield,
    Plus,
    FileSpreadsheet,
    Server,
    Database,
    BarChart3,
    MoreVertical,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { IdentityStrip } from "@/components/ui/IdentityStrip";
import { AIExplainButton } from "@/components/ui/AIExplainButton";
import { getCachedGlobalStats, getCachedSchoolsList, type SchoolRow } from "@/lib/dashboard-data";

// Server Component - Real Data
export default async function SystemOwnerDashboard() {
    const [stats, schools] = await Promise.all([getCachedGlobalStats(), getCachedSchoolsList()]);

    return (
        <div className="min-h-screen text-foreground p-6 lg:p-10" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-10">
                {/* Context Banner */}
                <IdentityStrip role="system_owner" />

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-[hsla(var(--gold),.10)] flex items-center justify-center text-[hsl(var(--gold))]">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground">مالك النظام</h1>
                        </div>
                        <p className="text-muted-foreground text-sm font-bold opacity-80">
                            غرفة عمليات النظام والتحليل الاستراتيجي
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/admin/schools/new">
                            <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                <Plus size={18} />
                                إضافة مدرسة جديدة
                            </button>
                        </Link>
                    </div>
                </header>

                {/* Global KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="إجمالي المدارس" value={stats.totalSchools} icon={<School className="w-6 h-6" />} color="text-primary" metricId="total_schools" />
                    <StatCard label="إجمالي المستخدمين" value={stats.totalUsers} icon={<Users className="w-6 h-6" />} color="text-accent" metricId="total_users" />
                    <StatCard label="إجمالي المعلمين" value={stats.totalTeachers} icon={<GraduationCap className="w-6 h-6" />} color="text-primary" metricId="total_teachers" />
                    <StatCard label="إجمالي الطلاب" value={stats.totalStudents} icon={<Users className="w-6 h-6" />} color="text-accent" metricId="total_students" />
                </div>

                {/* System Health & Data Quality */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="حالة النظام (System Health)">
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="flex items-center gap-2 mb-2 text-primary">
                                    <Activity size={16} />
                                    <span className="text-xs font-bold">API Status</span>
                                </div>
                                <p className="text-2xl font-black text-primary">Online</p>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="flex items-center gap-2 mb-2 text-primary">
                                    <Server size={16} />
                                    <span className="text-xs font-bold">Database</span>
                                </div>
                                <p className="text-2xl font-black text-primary">Connected</p>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="flex items-center gap-2 mb-2 text-destructive">
                                    <Database size={16} />
                                    <span className="text-xs font-bold">Missing Emails</span>
                                </div>
                                <p className="text-2xl font-black text-destructive tabular-nums">{stats.usersWithMissingEmail}</p>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border">
                                <div className="flex items-center gap-2 mb-2 text-accent">
                                    <TrendingUp size={16} />
                                    <span className="text-xs font-bold">Schools</span>
                                </div>
                                <p className="text-2xl font-black text-accent tabular-nums">{stats.totalSchools}</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="مؤشر الاستخدام (7 أيام)" className="lg:col-span-2">
                        <div className="h-[200px] mt-4 flex items-center justify-center rounded-xl bg-muted/20 border border-dashed border-border">
                            <div className="text-center">
                                <BarChart3 size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                                <p className="text-sm font-bold opacity-60 text-muted-foreground">لا توجد بيانات تحليلية متاحة</p>
                                <p className="text-xs opacity-40 mt-1 text-muted-foreground">سيتم عرض إحصائيات الاستخدام عند توفر البيانات</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Alerts / Audit / Data Quality */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card title="تنبيهات النظام" className="border-l-4 border-l-destructive">
                        <div className="space-y-4 mt-2">
                            {stats.totalSchools === 0 ? (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <AlertTriangle size={16} className="text-destructive mt-1 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-destructive">لا توجد مدارس مسجلة</p>
                                        <p className="text-[10px] text-destructive/80 mt-1">أضف مدرسة للبدء.</p>
                                    </div>
                                </div>
                            ) : stats.usersWithMissingEmail > 0 ? (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                    <AlertTriangle size={16} className="text-destructive mt-1 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-destructive">تحذير</p>
                                        <p className="text-xs font-bold text-foreground">{stats.usersWithMissingEmail} مستخدمين بدون بريد إلكتروني</p>
                                        <p className="text-[10px] text-destructive/80 mt-1">يُنصح بتحديث البيانات.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                    <Activity size={16} className="text-primary mt-1 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-primary">System Healthy</p>
                                        <p className="text-xs font-bold text-foreground">النظام يعمل بشكل طبيعي</p>
                                        <p className="text-[10px] text-primary/80 mt-1">لا توجد تنبيهات حالياً</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="سجل العمليات (Audit Center)">
                        <div className="h-[120px] mt-2 flex items-center justify-center">
                            <p className="text-xs font-bold opacity-40 text-muted-foreground">لا توجد عمليات مسجلة حديثاً</p>
                        </div>
                    </Card>

                    <Card title="جودة البيانات (Data Quality)">
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold opacity-60 text-muted-foreground">Missing Emails</span>
                                <span className={`text-xs font-bold ${stats.usersWithMissingEmail > 0 ? "text-destructive" : "text-primary"}`}>
                                    {stats.usersWithMissingEmail} records
                                </span>
                            </div>

                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${stats.usersWithMissingEmail > 0 ? "bg-destructive" : "bg-primary"}`}
                                    style={{
                                        width: `${Math.min((stats.usersWithMissingEmail / Math.max(stats.totalUsers, 1)) * 100, 100)}%`,
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-bold opacity-60 text-muted-foreground">Total Users</span>
                                <span className="text-xs font-bold text-primary">{stats.totalUsers}</span>
                            </div>

                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-full" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Schools Table */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <School size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-card-foreground">المدارس المسجلة</h3>
                                <p className="text-xs text-muted-foreground">إجمالي {schools.length} مدرسة</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        {schools.length === 0 ? (
                            <div className="p-12 text-center">
                                <School size={48} className="mx-auto mb-4 opacity-10 text-muted-foreground" />
                                <p className="text-lg font-bold opacity-40 mb-2 text-muted-foreground">لا توجد مدارس مسجلة</p>
                                <p className="text-sm opacity-20 mb-6 text-muted-foreground">ابدأ بإضافة مدرسة جديدة لإدارتها من هنا</p>
                                <Link href="/admin/schools/new">
                                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all">
                                        <Plus size={18} />
                                        إضافة مدرسة جديدة
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <table className="w-full text-right">
                                <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">اسم المدرسة</th>
                                        <th className="px-6 py-4">المعرّف</th>
                                        <th className="px-6 py-4">النوع</th>
                                        <th className="px-6 py-4">تاريخ التسجيل</th>
                                        <th className="px-6 py-4">الحالة</th>
                                        <th className="px-6 py-4 text-left">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {schools.map((school) => (
                                        <SchoolTableRow key={school.id} school={school} />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    metricId,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    metricId: string;
}) {
    return (
        <div className="bg-card p-6 rounded-[2rem] border border-border relative overflow-hidden group shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-muted/50 ${color}`}>{icon}</div>
                <AIExplainButton metricId={metricId} metricTitle={label} value={value} />
            </div>
            <h3 className="text-3xl font-black tabular-nums text-card-foreground">{value.toLocaleString("en-US")}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
    );
}

function SchoolTableRow({ school }: { school: SchoolRow }) {
    const formattedDate = new Date(school.created_at).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <tr className="group hover:bg-muted/50 transition-colors">
            <td className="px-6 py-4 font-bold text-sm text-primary group-hover:underline cursor-pointer">
                <Link href={`/school/${school.id}/dashboard`}>{school.name}</Link>
            </td>
            <td className="px-6 py-4 text-xs font-mono opacity-60 text-muted-foreground">{school.slug}</td>
            <td className="px-6 py-4 text-xs opacity-80 text-foreground">{school.type || "خاص"}</td>
            <td className="px-6 py-4 text-xs opacity-60 text-muted-foreground">{formattedDate}</td>
            <td className="px-6 py-4">
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">نشط</span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/admin/schools/${school.id}/staff`}>
                        <button
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="الموظفين"
                        >
                            <Users size={16} />
                        </button>
                    </Link>

                    <Link href={`/admin/schools/${school.id}/onboarding`}>
                        <button
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Onboarding"
                        >
                            <FileSpreadsheet size={16} />
                        </button>
                    </Link>

                    <button className="p-2 bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors" aria-label="الإشعارات">
                        <Bell size={20} />
                    </button>

                    <button className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors" aria-label="خيارات إضافية">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
}