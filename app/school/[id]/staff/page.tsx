import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Users,
    UserPlus,
    UserCheck,
    Mail,
    AlertTriangle,
    Inbox,
    type LucideIcon,
} from "lucide-react";
import { getSchoolStaff, type StaffMember } from "@/app/_actions/staff";
import { getCachedSchoolStats, validateSchoolAccess } from "@/lib/dashboard-data";
import { getActivePersona } from "@/lib/auth/context-service";
import { getRoleInfo, type UserRole } from "@/lib/auth/roles";
import { SchoolDashboardShell } from "@/components/layout/SchoolDashboardShell";
import { getMySchoolPersonas } from "@/app/_actions/qa-roles";
import { QaRoleTool } from "./_components/QaRoleTool";

export const metadata = { title: "إدارة الموظفين" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function StaffPage({ params }: PageProps) {
    const { id: schoolId } = await params;

    // أمان: التحقق من وصول المستخدم لهذه المدرسة (دفاع متعمّق فوق حُرّاس التخطيط)
    const { valid } = await validateSchoolAccess(schoolId);
    if (!valid) redirect("/portal");

    const persona = await getActivePersona();
    const role: UserRole = persona?.role ?? "school_admin";
    const isOwner = persona?.isSystemOwner === true;

    const [stats, staffResult, myRoles] = await Promise.all([
        getCachedSchoolStats(schoolId),
        getSchoolStaff({ schoolId }),
        isOwner ? getMySchoolPersonas(schoolId) : Promise.resolve<string[]>([]),
    ]);

    const staff: StaffMember[] = staffResult?.data ?? [];
    const serverError: string | undefined = staffResult?.serverError;

    const activeCount = staff.filter((m) => m.kind === "active").length;
    const pendingCount = staff.filter((m) => m.kind === "invite" && m.status === "pending").length;

    return (
        <SchoolDashboardShell schoolId={schoolId} schoolName={stats.schoolName} role={role}>
            <div className="space-y-6">
                {/* الترويسة */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">إدارة الموظفين</h1>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                            إدارة منسوبي المدرسة وأدوارهم وصلاحياتهم التشغيلية
                        </p>
                    </div>
                    <Link
                        href={`/school/${schoolId}/staff/new`}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                    >
                        <UserPlus className="h-4 w-4" />
                        إضافة موظف
                    </Link>
                </div>

                {/* بطاقات ملخّص — مشتقّة من القائمة الحقيقية */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SummaryCard label="إجمالي المنسوبين" value={staff.length} icon={Users} tone="teal" />
                    <SummaryCard label="نشطون" value={activeCount} icon={UserCheck} tone="blue" />
                    <SummaryCard label="دعوات معلّقة" value={pendingCount} icon={Mail} tone="teal" />
                </div>

                {/* خطأ */}
                {serverError && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <div>
                            <p className="text-sm font-black text-foreground">تعذّر جلب بيانات الموظفين</p>
                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{serverError}</p>
                        </div>
                    </div>
                )}

                {/* حالة فارغة */}
                {!serverError && staff.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
                        <Inbox className="mb-4 h-12 w-12 text-muted-foreground/40" />
                        <h3 className="text-lg font-black text-foreground">لا يوجد منسوبون مسجّلون حالياً</h3>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            ابدأ بإضافة المنسوبين لبناء فريق العمل وتحديد أدوارهم وصلاحياتهم.
                        </p>
                        <Link
                            href={`/school/${schoolId}/staff/new`}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                        >
                            <UserPlus className="h-4 w-4" />
                            إضافة منسوب جديد
                        </Link>
                    </div>
                )}

                {/* شبكة المنسوبين */}
                {!serverError && staff.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {staff.map((member) => (
                            <StaffCard key={member.id} member={member} />
                        ))}
                    </div>
                )}

                {/* أدوات اختبار مالك النظام — مرئية وقابلة للتنفيذ لـ system_owner فقط */}
                {isOwner && (
                    <QaRoleTool
                        schoolId={schoolId}
                        schoolName={stats.schoolName}
                        userName={persona?.displayName ?? ""}
                        userEmail={persona?.email ?? ""}
                        currentRoles={myRoles}
                    />
                )}
            </div>
        </SchoolDashboardShell>
    );
}

// ============================================================
// مكوّنات عرض (Server Components — بلا حالة)
// ============================================================

type Tone = "teal" | "blue";

function SummaryCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: Tone;
}) {
    const toneClasses = tone === "teal" ? "bg-primary/10 text-primary" : "bg-blue-50 text-blue-600";
    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses}`}>
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-black tabular-nums text-foreground">{value.toLocaleString("en-US")}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{label}</p>
        </div>
    );
}

function StaffCard({ member }: { member: StaffMember }) {
    const initials = (member.full_name?.trim()?.[0] || member.email?.trim()?.[0] || "؟").toUpperCase();
    const roles = member.roles ?? [];

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-blue-500/15 text-lg font-black text-foreground">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-black leading-tight text-foreground">
                            {member.full_name || "بدون اسم"}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">{member.email || "—"}</p>
                    </div>
                </div>
                <StatusBadge status={member.status} />
            </div>

            {/* الأدوار — تسميات عربية فقط */}
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                {roles.length === 0 ? (
                    <span className="text-[11px] font-medium text-muted-foreground">بلا أدوار محددة</span>
                ) : (
                    <>
                        {roles.slice(0, 4).map((roleKey) => (
                            <span
                                key={roleKey}
                                className="rounded-full border border-border bg-surface-soft px-2.5 py-0.5 text-[11px] font-bold text-foreground"
                            >
                                {roleLabelAr(roleKey)}
                            </span>
                        ))}
                        {roles.length > 4 && (
                            <span className="rounded-full border border-border bg-surface-soft px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                                +{roles.length - 4}
                            </span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: StaffMember["status"] }) {
    const map: Record<StaffMember["status"], { label: string; classes: string }> = {
        active: { label: "نشط", classes: "bg-emerald-50 text-emerald-600 border-emerald-200" },
        pending: { label: "دعوة معلّقة", classes: "bg-amber-50 text-amber-600 border-amber-200" },
        expired: { label: "دعوة منتهية", classes: "bg-rose-50 text-rose-600 border-rose-200" },
    };
    const cfg = map[status];
    return (
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${cfg.classes}`}>
            {cfg.label}
        </span>
    );
}

// تسمية عربية آمنة — getRoleInfo يُعيد «غير معروف» لأي مفتاح غير قياسي، فلا يظهر مفتاح إنجليزي خام أبداً.
function roleLabelAr(roleKey: string): string {
    return getRoleInfo(roleKey as UserRole).labelAr;
}
