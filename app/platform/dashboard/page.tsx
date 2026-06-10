import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    School,
    Users,
    GraduationCap,
    IdCard,
    MailWarning,
    ShieldAlert,
    Plus,
    Workflow,
    SlidersHorizontal,
    CalendarRange,
    Activity,
    ScrollText,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    BarChart3,
} from "lucide-react";

import { getActivePersona } from "@/lib/auth/context-service";
import {
    getCachedPlatformStats,
    getCachedSchoolsList,
    getCachedRecentAudit,
    type SchoolRow,
    type RoleCount,
    type AuditEntry,
} from "@/lib/dashboard-data";
import { getRoleInfo, type UserRole } from "@/lib/auth/roles";

export const metadata = { title: "غرفة عمليات المنصّة" };

// أسماء إجراءات سجل التدقيق بالعربية (fallback: "إجراء")
const ACTION_LABELS: Record<string, string> = {
    persona_switch: "تبديل الدور",
};

export default async function PlatformDashboard() {
    // دفاع متعمّق (الحارس الأساسي في app/platform/layout.tsx)
    const persona = await getActivePersona();
    if (!persona || persona.role !== "system_owner") redirect("/portal");

    const [stats, schools, audit] = await Promise.all([
        getCachedPlatformStats(),
        getCachedSchoolsList(),
        getCachedRecentAudit(),
    ]);

    // تنبيهات قائمة على قواعد حتمية من مقاييس حقيقية فقط — لا تزييف
    const alerts: { tone: "danger" | "warning"; title: string; detail: string }[] = [];
    if (stats.totalSchools === 0) {
        alerts.push({ tone: "warning", title: "لا توجد مدارس مسجّلة", detail: "ابدأ بإضافة مدرسة لتشغيل المنصّة." });
    }
    if (stats.schoolsWithoutAdmin > 0) {
        alerts.push({
            tone: "danger",
            title: `${stats.schoolsWithoutAdmin} مدرسة بلا منسق`,
            detail: "هذه المدارس لا تملك دور «منسق المدرسة» — تحتاج تعيينًا.",
        });
    }
    if (stats.usersWithMissingEmail > 0) {
        alerts.push({
            tone: "warning",
            title: `${stats.usersWithMissingEmail} مستخدم بلا بريد إلكتروني`,
            detail: "سجلات ناقصة قد تعيق الدعوات والإشعارات.",
        });
    }

    return (
        <div className="space-y-8">
            {/* ترويسة الصفحة */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                        غرفة عمليات المنصّة
                    </h1>
                    <p className="mt-1.5 text-sm text-foreground/70">
                        نظرة شاملة على المدارس والمستخدمين والأدوار وجودة البيانات عبر المنصّة بالكامل.
                    </p>
                </div>
                <Link
                    href="/platform/schools/new"
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    إضافة مدرسة
                </Link>
            </header>

            {/* 1) نظرة تنفيذية — مقاييس حقيقية */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi icon={School} tone="primary" label="المدارس" value={stats.totalSchools} />
                <Kpi icon={Users} tone="info" label="المستخدمون" value={stats.totalUsers} />
                <Kpi icon={IdCard} tone="primary" label="الأدوار النشطة" value={stats.totalPersonas} />
                <Kpi icon={GraduationCap} tone="info" label="المعلمون" value={stats.totalTeachers} />
                <Kpi icon={Users} tone="primary" label="الطلاب" value={stats.totalStudents} />
                <Kpi
                    icon={ShieldAlert}
                    tone={stats.schoolsWithoutAdmin > 0 ? "danger" : "success"}
                    label="مدارس بلا منسق"
                    value={stats.schoolsWithoutAdmin}
                />
                <Kpi
                    icon={MailWarning}
                    tone={stats.usersWithMissingEmail > 0 ? "warning" : "success"}
                    label="بريد إلكتروني مفقود"
                    value={stats.usersWithMissingEmail}
                />
            </section>

            {/* 2) تنبيهات ومخاطر (قواعد حتمية) + صحة المنصّة (حالة فارغة صادقة) */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Panel title="تنبيهات ومخاطر" icon={AlertTriangle} className="lg:col-span-2">
                    {alerts.length === 0 ? (
                        <Empty
                            icon={CheckCircle2}
                            tone="success"
                            title="لا توجد تنبيهات حالية"
                            detail="لم تُرصد أي مخاطر من المقاييس المتاحة."
                        />
                    ) : (
                        <ul className="space-y-3">
                            {alerts.map((a) => (
                                <li
                                    key={a.title}
                                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                                        a.tone === "danger"
                                            ? "border-destructive/30 bg-destructive/10"
                                            : "border-warning/30 bg-warning/10"
                                    }`}
                                >
                                    <AlertTriangle
                                        className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone === "danger" ? "text-destructive" : "text-warning"}`}
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{a.title}</p>
                                        <p className="mt-0.5 text-xs text-foreground/70">{a.detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>

                <Panel title="صحة المنصّة" icon={Activity}>
                    <Empty
                        icon={Activity}
                        title="لم يتم تفعيل مراقبة صحة المنصّة بعد"
                        detail="ستظهر هنا حالة الخدمات والوظائف الخلفية عند ربط مصدر مراقبة حقيقي."
                    />
                </Panel>
            </section>

            {/* 3) حوكمة المستخدمين والأدوار (توزيع حقيقي) + جودة البيانات */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel title="حوكمة المستخدمين والأدوار" icon={Users}>
                    {stats.roleDistribution.length === 0 ? (
                        <Empty
                            icon={Users}
                            title="لا توجد أدوار مسندة بعد"
                            detail="سيظهر توزيع الأدوار عند إسناد الأدوار للمستخدمين."
                        />
                    ) : (
                        <RoleDistribution data={stats.roleDistribution} totalPersonas={stats.totalPersonas} />
                    )}
                </Panel>

                <Panel title="مركز جودة البيانات" icon={BarChart3} id="data-quality">
                    <div className="space-y-4">
                        <QualityRow
                            label="مستخدمون بلا بريد إلكتروني"
                            value={stats.usersWithMissingEmail}
                            total={stats.totalUsers}
                            bad={stats.usersWithMissingEmail > 0}
                        />
                        <QualityRow
                            label="مدارس بلا منسق"
                            value={stats.schoolsWithoutAdmin}
                            total={stats.totalSchools}
                            bad={stats.schoolsWithoutAdmin > 0}
                        />
                        <p className="pt-1 text-[11px] text-muted-foreground">
                            فحوصات إضافية (التكرارات، الحقول الناقصة) — غير مفعّلة بعد.
                        </p>
                    </div>
                </Panel>
            </section>

            {/* 4) سجل النشاط (حقيقي إن توفّر) + توصيات الذكاء (placeholder صادق) */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Panel title="سجل النشاط" icon={ScrollText}>
                    <AuditStream audit={audit} />
                </Panel>

                <Panel title="توصيات ذكية" icon={Sparkles}>
                    <Empty
                        icon={Sparkles}
                        title="لم تُولّد توصيات ذكية بعد"
                        detail="ستظهر هنا التوصيات عند تفعيل طبقة الذكاء الاصطناعي وربطها بالبيانات التشغيلية للمنصّة."
                    />
                </Panel>
            </section>

            {/* 5) إجراءات سريعة (مسارات حقيقية فقط) */}
            <section>
                <h2 className="mb-3 text-sm font-black text-foreground">إجراءات سريعة</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <QuickAction href="/platform/schools/new" icon={Plus} label="إضافة مدرسة" />
                    <QuickAction href="/platform/automation" icon={Workflow} label="الأتمتة" />
                    <QuickAction href="/platform/setup" icon={SlidersHorizontal} label="إعداد المنصّة" />
                    <QuickAction href="/platform/timetable" icon={CalendarRange} label="الجدول العام" />
                    <QuickAction href="#data-quality" icon={BarChart3} label="مراجعة جودة البيانات" />
                </div>
            </section>

            {/* 6) جدول المدارس */}
            <section>
                <SchoolsTable schools={schools} />
            </section>
        </div>
    );
}

// ── بطاقة مؤشّر ──────────────────────────────────────────────────────────────
const TONE_ICON: Record<string, string> = {
    primary: "bg-accent text-primary",
    info: "bg-info/10 text-info",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
};

function Kpi({
    icon: Icon,
    tone,
    label,
    value,
    textValue,
}: {
    icon: React.ComponentType<{ className?: string }>;
    tone: keyof typeof TONE_ICON;
    label: string;
    value?: number;
    textValue?: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}>
                <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-2xl font-black leading-none text-foreground tabular-nums">
                {textValue ?? (value ?? 0).toLocaleString("en-US")}
            </p>
            <p className="mt-1.5 text-[11px] font-bold text-foreground/70">{label}</p>
        </div>
    );
}

// ── لوحة قسم ────────────────────────────────────────────────────────────────
function Panel({
    title,
    icon: Icon,
    children,
    className = "",
    id,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    className?: string;
    id?: string;
}) {
    return (
        <div id={id} className={`scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
            <div className="mb-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-black text-foreground">{title}</h2>
            </div>
            {children}
        </div>
    );
}

// ── حالة فارغة صادقة ────────────────────────────────────────────────────────
function Empty({
    icon: Icon,
    title,
    detail,
    tone = "muted",
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    detail?: string;
    tone?: "muted" | "success";
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center">
            <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    tone === "success" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
            {detail && <p className="mt-1 max-w-sm text-xs text-foreground/70">{detail}</p>}
        </div>
    );
}

// ── توزيع الأدوار ───────────────────────────────────────────────────────────
function RoleDistribution({ data, totalPersonas }: { data: RoleCount[]; totalPersonas: number }) {
    const max = Math.max(...data.map((d) => d.count), 1);
    return (
        <ul className="space-y-2.5">
            {data.map((d) => {
                const labelAr = getRoleInfo(d.role as UserRole).labelAr;
                return (
                    <li key={d.role}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{labelAr}</span>
                            <span className="font-bold text-foreground/70 tabular-nums">{d.count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                    </li>
                );
            })}
            <li className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="font-bold text-foreground">إجمالي الأدوار النشطة</span>
                <span className="font-black text-primary tabular-nums">{totalPersonas}</span>
            </li>
        </ul>
    );
}

// ── صف جودة بيانات ──────────────────────────────────────────────────────────
function QualityRow({ label, value, total, bad }: { label: string; value: number; total: number; bad: boolean }) {
    const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{label}</span>
                <span className={`font-bold tabular-nums ${bad ? "text-destructive" : "text-success"}`}>
                    {value.toLocaleString("en-US")}
                </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${bad ? "bg-destructive" : "bg-success"}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// ── سجل التدقيق ─────────────────────────────────────────────────────────────
function AuditStream({ audit }: { audit: { connected: boolean; entries: AuditEntry[] } }) {
    if (!audit.connected) {
        return <Empty icon={ScrollText} title="سجل التدقيق غير مربوط بعد" detail="تعذّرت قراءة سجل العمليات من المصدر." />;
    }
    if (audit.entries.length === 0) {
        return <Empty icon={ScrollText} title="لا يوجد نشاط مسجّل بعد" detail="ستظهر آخر العمليات هنا فور حدوثها." />;
    }
    return (
        <ul className="divide-y divide-border">
            {audit.entries.map((e) => {
                const action = ACTION_LABELS[e.action_name] ?? "إجراء";
                const roleAr = e.role ? getRoleInfo(e.role as UserRole).labelAr : "—";
                const when = new Date(e.created_at).toLocaleString("ar-SA", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-foreground">
                                {action} — <span className="text-foreground/70">{roleAr}</span>
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{when}</p>
                        </div>
                        <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                e.status === "success" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {e.status === "success" ? "ناجح" : e.status ?? "—"}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

// ── إجراء سريع ──────────────────────────────────────────────────────────────
function QuickAction({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <Link
            href={href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold text-foreground">{label}</span>
        </Link>
    );
}

// ── جدول المدارس ────────────────────────────────────────────────────────────
function SchoolsTable({ schools }: { schools: SchoolRow[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                        <School className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-black text-foreground">المدارس المسجّلة</h2>
                        <p className="text-[11px] text-muted-foreground">{schools.length} مدرسة</p>
                    </div>
                </div>
            </div>

            {schools.length === 0 ? (
                <Empty icon={School} title="لا توجد مدارس مسجّلة" detail="ابدأ بإضافة مدرسة لإدارتها من هنا." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-surface-soft text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3 font-bold">اسم المدرسة</th>
                                <th className="px-5 py-3 font-bold">المعرّف</th>
                                <th className="px-5 py-3 font-bold">النوع</th>
                                <th className="px-5 py-3 font-bold">تاريخ التسجيل</th>
                                <th className="px-5 py-3 font-bold">الحالة</th>
                                <th className="px-5 py-3 text-left font-bold">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {schools.map((school) => (
                                <tr key={school.id} className="group transition-colors hover:bg-surface-soft">
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/school/${school.id}/dashboard`}
                                            className="text-sm font-bold text-foreground hover:text-primary"
                                        >
                                            {school.name}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{school.slug}</td>
                                    <td className="px-5 py-3 text-xs text-foreground/80">{school.type || "خاص"}</td>
                                    <td className="px-5 py-3 text-xs text-muted-foreground">
                                        {new Date(school.created_at).toLocaleDateString("ar-SA", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                school.suspended
                                                    ? "bg-destructive/10 text-destructive"
                                                    : "bg-success/10 text-success"
                                            }`}
                                        >
                                            {school.suspended ? "موقوفة" : "نشطة"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link
                                                href={`/platform/schools/${school.id}/staff`}
                                                title="الموظفون"
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                                            >
                                                <Users className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={`/platform/schools/${school.id}/onboarding`}
                                                title="التهيئة"
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
