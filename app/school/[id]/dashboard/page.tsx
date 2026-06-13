import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Users,
    GraduationCap,
    Layers,
    UserPlus,
    Upload,
    FileSpreadsheet,
    Settings2,
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    Circle,
    Sparkles,
    Activity,
    Database,
    CalendarCheck,
    Inbox,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import {
    getCachedSchoolStats,
    getCachedSchoolAudit,
    validateSchoolAccess,
    type AuditEntry,
} from "@/lib/dashboard-data";
import { getActivePersona } from "@/lib/auth/context-service";
import { getRoleInfo, normalizeRole, type UserRole } from "@/lib/auth/roles";
import { SchoolDashboardShell } from "@/components/layout/SchoolDashboardShell";
import { QualityOwnerPanel } from "@/components/quality/QualityOwnerPanel";
import { toSafeNumber } from "@/lib/utils";

export const metadata = { title: "لوحة المدرسة" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function SchoolCoordinatorDashboard({ params }: PageProps) {
    const { id: schoolId } = await params;

    // أمان: التحقق من وصول المستخدم لهذه المدرسة (طبقة دفاع متعمّق فوق حُرّاس التخطيط)
    const { valid } = await validateSchoolAccess(schoolId);
    if (!valid) redirect("/portal");

    // الدور النشط (عربي في العرض) — لوحة الإدارة محروسة لـ school_admin + system_owner
    const persona = await getActivePersona();
    const role: UserRole = persona?.role ?? "school_admin";

    // بيانات حقيقية فقط
    const [stats, audit] = await Promise.all([
        getCachedSchoolStats(schoolId),
        getCachedSchoolAudit(schoolId),
    ]);

    // ── مقاييس مشتقّة حتمية من البيانات الحقيقية ──────────────────────────────
    const readiness: ReadinessItem[] = [
        { label: "تسجيل الموظفين", done: stats.totalStaff > 0 },
        { label: "تسجيل المعلمين", done: stats.totalTeachers > 0 },
        { label: "تسجيل الطلاب", done: stats.totalStudents > 0 },
        { label: "إنشاء الفصول الدراسية", done: stats.totalClasses > 0 },
    ];
    const readinessDone = readiness.filter((r) => r.done).length;
    const readinessPct = Math.round((readinessDone / readiness.length) * 100);
    const hasAnyData =
        stats.totalStudents + stats.totalTeachers + stats.totalStaff + stats.totalClasses > 0;

    // تنبيهات/خطوات تالية — قواعد حتمية من البيانات الحقيقية فقط
    const alerts: AlertItem[] = [];
    if (stats.totalStudents === 0)
        alerts.push({ text: "لا يوجد طلاب مسجلون في هذه المدرسة.", ctaLabel: "استيراد البيانات", href: `/school/${schoolId}/setup`, severity: "high" });
    if (stats.totalTeachers === 0)
        alerts.push({ text: "لا يوجد معلمون مسجلون بعد.", ctaLabel: "إضافة موظف", href: `/school/${schoolId}/staff/new`, severity: "high" });
    if (stats.totalClasses === 0)
        alerts.push({ text: "لا توجد فصول دراسية منشأة.", ctaLabel: "الهيكل الأكاديمي", href: `/school/${schoolId}/academic-setup`, severity: "medium" });

    // مشكلات جودة البيانات — مكتشفة من العدّادات الحقيقية (نقص كيانات أساسية)
    const dataIssues: string[] = [];
    if (stats.totalStudents === 0) dataIssues.push("لا توجد سجلات طلاب");
    if (stats.totalTeachers === 0) dataIssues.push("لا توجد سجلات معلمين");
    if (stats.totalClasses === 0) dataIssues.push("لا توجد فصول دراسية");

    // قراءة آمنة لقيود التدقيق (دفاع متعمّق ضد شكل ناقص/قديم من الكاش)
    const auditEntries = audit.connected && Array.isArray(audit.entries) ? audit.entries : [];
    const lastUpdated = auditEntries.length > 0 ? auditEntries[0].created_at : null;

    return (
        <SchoolDashboardShell schoolId={schoolId} schoolName={stats.schoolName} role={role}>
            <div className="space-y-6">
                {/* 1) ترويسة السياق / الترحيب */}
                <WelcomeHeader
                    schoolName={stats.schoolName}
                    roleLabel={getRoleInfo(role).labelAr}
                    readinessPct={readinessPct}
                    hasAnyData={hasAnyData}
                />

                {/* 2) بطاقات المؤشرات التنفيذية — بيانات حقيقية */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <KpiCard label="إجمالي الطلاب" value={stats.totalStudents} icon={Users} tone="blue" />
                    <KpiCard label="إجمالي المعلمين" value={stats.totalTeachers} icon={GraduationCap} tone="teal" />
                    <KpiCard label="إجمالي الموظفين" value={stats.totalStaff} icon={ShieldCheck} tone="blue" href={`/school/${schoolId}/staff`} />
                    <KpiCard label="إجمالي الفصول" value={stats.totalClasses} icon={Layers} tone="teal" />
                </div>

                {/* الشبكة الرئيسية: عمود محتوى + عمود جانبي */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* العمود الرئيسي */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* 3) جاهزية المدرسة / تقدّم الإعداد */}
                        <SectionCard title="جاهزية المدرسة" icon={ShieldCheck}>
                            {hasAnyData ? (
                                <div className="space-y-5">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-3xl font-black tabular-nums text-foreground">{readinessPct}%</p>
                                            <p className="text-xs font-bold text-muted-foreground">
                                                اكتمل {readinessDone} من {readiness.length} من خطوات الإعداد الأساسية
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${readinessPct}%` }} />
                                    </div>
                                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {readiness.map((item) => (
                                            <li key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2.5">
                                                {item.done ? (
                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                                ) : (
                                                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                                )}
                                                <span className={`text-sm font-bold ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                                                    {item.label}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Inbox}
                                    title="لا توجد بيانات كافية لحساب جاهزية المدرسة بعد"
                                    hint="ابدأ بإضافة الموظفين والمعلمين والطلاب لتظهر مؤشّرات الجاهزية."
                                />
                            )}
                        </SectionCard>

                        {/* 4) مركز جودة البيانات */}
                        <SectionCard title="مركز جودة البيانات" icon={Database}>
                            {dataIssues.length > 0 ? (
                                <ul className="space-y-2">
                                    {dataIssues.map((issue) => (
                                        <li key={issue} className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                            <span className="text-sm font-bold text-foreground">{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState icon={CheckCircle2} title="لا توجد مشكلات جودة بيانات مكتشفة" tone="ok" />
                            )}
                            <p className="mt-3 text-[11px] font-medium leading-relaxed text-muted-foreground">
                                فحوصات أدقّ على مستوى السجل (طلاب بلا فصل، مستخدمون بلا بريد) ستتوفّر عند اكتمال ربط بيانات الإسناد.
                            </p>
                        </SectionCard>

                        {/* 7) الحضور / النشاط */}
                        <SectionCard title="الحضور — آخر ٧ أيام" icon={CalendarCheck}>
                            <EmptyState
                                icon={CalendarCheck}
                                title="لا توجد بيانات حضور متاحة بعد"
                                hint="ستظهر مؤشّرات الحضور هنا فور تسجيل بيانات الحصص والفصول."
                            />
                        </SectionCard>

                        {/* 8) النشاط الأخير — تدقيق حقيقي معزول بـ school_id */}
                        <SectionCard title="النشاط الأخير" icon={Activity}>
                            {auditEntries.length > 0 ? (
                                <ul className="divide-y divide-border">
                                    {auditEntries.map((entry) => (
                                        <AuditRow key={entry.id} entry={entry} />
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState icon={Inbox} title="لا يوجد نشاط حديث" />
                            )}
                        </SectionCard>
                    </div>

                    {/* العمود الجانبي */}
                    <div className="space-y-6">
                        {/* 5) إجراءات سريعة — مسارات حقيقية فقط */}
                        <SectionCard title="إجراءات سريعة" icon={ArrowLeft}>
                            <div className="grid grid-cols-1 gap-2.5">
                                <QuickAction label="إضافة موظف" icon={UserPlus} href={`/school/${schoolId}/staff/new`} />
                                <QuickAction label="إدارة الفصول" icon={Layers} href={`/school/${schoolId}/classroom`} />
                                <QuickAction label="الهيكل الأكاديمي" icon={Settings2} href={`/school/${schoolId}/academic-setup`} />
                                <QuickAction label="استيراد البيانات" icon={Upload} href={`/school/${schoolId}/setup`} />
                                <QuickAction label="الرفع الجماعي" icon={FileSpreadsheet} href="/bulk-upload" />
                                <QuickAction label="إضافة طالب" icon={GraduationCap} comingSoon />
                                <QuickAction label="دعوة مستخدم" icon={Users} comingSoon />
                            </div>
                        </SectionCard>

                        {/* 6) تنبيهات / خطوات تالية */}
                        <SectionCard title="تنبيهات وخطوات تالية" icon={AlertTriangle}>
                            {alerts.length > 0 ? (
                                <ul className="space-y-2.5">
                                    {alerts.map((a, i) => (
                                        <li
                                            key={i}
                                            className={`rounded-xl border px-3 py-3 ${
                                                a.severity === "high"
                                                    ? "border-rose-200 bg-rose-50"
                                                    : "border-amber-200 bg-amber-50"
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle
                                                    className={`mt-0.5 h-4 w-4 shrink-0 ${a.severity === "high" ? "text-rose-600" : "text-amber-600"}`}
                                                />
                                                <span className="text-sm font-bold text-foreground">{a.text}</span>
                                            </div>
                                            <Link
                                                href={a.href}
                                                className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
                                            >
                                                {a.ctaLabel}
                                                <ArrowLeft className="h-3 w-3" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState icon={CheckCircle2} title="لا توجد تنبيهات تتطلّب إجراءً" tone="ok" />
                            )}
                        </SectionCard>

                        {/* 9) توصيات ذكية — placeholder صادق (بلا AI وهمي) */}
                        <SectionCard title="التوصيات الذكية" icon={Sparkles}>
                            <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-6 text-center">
                                <Sparkles className="mx-auto mb-3 h-7 w-7 text-primary/50" />
                                <p className="text-sm font-bold text-foreground">لم تُولّد توصيات ذكية لهذه المدرسة بعد</p>
                                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                    ستظهر هنا التوصيات عند تفعيل طبقة الذكاء وربطها ببيانات المدرسة.
                                </p>
                            </div>
                        </SectionCard>

                        {/* نماذج الجودة (مالك: منسق المدرسة) — مُبوّبة بسجلّ المستأجر */}
                        <QualityOwnerPanel module="school_admin" moduleLabel="تنسيق المدرسة" />
                    </div>
                </div>

                {/* 10) لقطة بيانات المدرسة */}
                <SectionCard title="لقطة بيانات المدرسة" icon={Database}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <SnapshotStat label="الطلاب" value={stats.totalStudents} />
                        <SnapshotStat label="المعلمون" value={stats.totalTeachers} />
                        <SnapshotStat label="الموظفون" value={stats.totalStaff} />
                        <SnapshotStat label="الفصول" value={stats.totalClasses} />
                    </div>
                    {lastUpdated && (
                        <p className="mt-4 text-[11px] font-bold text-muted-foreground">
                            آخر نشاط مُسجّل: {formatRelativeAr(lastUpdated)}
                        </p>
                    )}
                </SectionCard>
            </div>
        </SchoolDashboardShell>
    );
}

// ============================================================
// أنواع محلية
// ============================================================

interface ReadinessItem {
    label: string;
    done: boolean;
}

interface AlertItem {
    text: string;
    ctaLabel: string;
    href: string;
    severity: "high" | "medium";
}

type KpiTone = "teal" | "blue";

// ============================================================
// مكوّنات عرض (Server Components — بلا حالة)
// ============================================================

function WelcomeHeader({
    schoolName,
    roleLabel,
    readinessPct,
    hasAnyData,
}: {
    schoolName: string;
    roleLabel: string;
    readinessPct: number;
    hasAnyData: boolean;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                            {roleLabel}
                        </span>
                    </div>
                    <h1 className="truncate text-2xl font-black tracking-tight text-foreground">{schoolName}</h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                        لوحة تشغيل المدرسة وإدارة بياناتها الأساسية
                    </p>
                </div>
                {hasAnyData && (
                    <div className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-center">
                        <p className="text-2xl font-black tabular-nums text-primary">{readinessPct}%</p>
                        <p className="text-[11px] font-bold text-muted-foreground">جاهزية الإعداد</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function KpiCard({
    label,
    value,
    icon: Icon,
    tone,
    href,
}: {
    label: string;
    value: number | null | undefined;
    icon: LucideIcon;
    tone: KpiTone;
    href?: string;
}) {
    const toneClasses = tone === "teal" ? "bg-primary/10 text-primary" : "bg-blue-50 text-blue-600";
    const card = (
        <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses}`}>
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black tabular-nums text-foreground">{toSafeNumber(value).toLocaleString("en-US")}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
        </div>
    );
    return href ? (
        <Link href={href} className="block">
            {card}
        </Link>
    ) : (
        card
    );
}

function SectionCard({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-black text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {title}
            </h2>
            {children}
        </section>
    );
}

function QuickAction({
    label,
    icon: Icon,
    href,
    comingSoon,
}: {
    label: string;
    icon: LucideIcon;
    href?: string;
    comingSoon?: boolean;
}) {
    if (comingSoon || !href) {
        return (
            <span className="flex cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3 text-muted-foreground/60">
                <span className="flex items-center gap-3 text-sm font-bold">
                    <Icon className="h-4 w-4" />
                    {label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-black text-muted-foreground">قريباً</span>
            </span>
        );
    }
    return (
        <Link
            href={href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3.5 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
            <span className="flex items-center gap-3 text-sm font-bold text-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
            </span>
            <ArrowLeft className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </Link>
    );
}

function SnapshotStat({ label, value }: { label: string; value: number | null | undefined }) {
    return (
        <div className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-center">
            <p className="text-2xl font-black tabular-nums text-foreground">{toSafeNumber(value).toLocaleString("en-US")}</p>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground">{label}</p>
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    hint,
    tone = "neutral",
}: {
    icon: LucideIcon;
    title: string;
    hint?: string;
    tone?: "neutral" | "ok";
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center">
            <Icon className={`mb-2 h-8 w-8 ${tone === "ok" ? "text-emerald-500/50" : "text-muted-foreground/40"}`} />
            <p className="text-sm font-bold text-foreground">{title}</p>
            {hint && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
    );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
    const normalized = entry.role ? normalizeRole(entry.role) : null;
    const roleLabel = normalized ? getRoleInfo(normalized).labelAr : null;
    return (
        <li className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground" dir="ltr">{entry.action_name}</p>
                    {roleLabel && <p className="text-[11px] font-medium text-muted-foreground">{roleLabel}</p>}
                </div>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{formatRelativeAr(entry.created_at)}</span>
        </li>
    );
}

// تنسيق زمني نسبي بالعربية (حتمي من created_at الحقيقي) — آمن ضد قيمة مفقودة/غير صالحة
function formatRelativeAr(iso: string | null | undefined): string {
    if (!iso) return "—";
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return "—";
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return "الآن";
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `قبل ${min} دقيقة`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `قبل ${hr} ساعة`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `قبل ${day} يوم`;
    return new Date(iso).toLocaleDateString("ar-SA");
}
