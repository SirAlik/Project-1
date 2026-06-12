import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { validateSchoolAccess, getCachedSchoolStats } from "@/lib/dashboard-data";
import { getActivePersona } from "@/lib/auth/context-service";
import { type UserRole } from "@/lib/auth/roles";
import { SchoolDashboardShell } from "@/components/layout/SchoolDashboardShell";
import { AddStaffForm } from "./_components/AddStaffForm";

export const metadata = { title: "إضافة موظف" };

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AddStaffPage({ params }: PageProps) {
    const { id: schoolId } = await params;

    // أمان: التحقق من وصول المستخدم لهذه المدرسة (دفاع متعمّق فوق حُرّاس التخطيط الأدمن)
    const { valid } = await validateSchoolAccess(schoolId);
    if (!valid) redirect("/portal");

    const persona = await getActivePersona();
    const role: UserRole = persona?.role ?? "school_admin";
    const stats = await getCachedSchoolStats(schoolId);

    return (
        <SchoolDashboardShell schoolId={schoolId} schoolName={stats.schoolName} role={role}>
            <div className="mx-auto max-w-3xl space-y-6">
                {/* الترويسة */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">إضافة موظف</h1>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                            إضافة منسوب جديد للمدرسة وتحديد أدواره التشغيلية
                        </p>
                    </div>
                    <Link
                        href={`/school/${schoolId}/staff`}
                        aria-label="رجوع إلى الموظفين"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>

                <AddStaffForm schoolId={schoolId} />
            </div>
        </SchoolDashboardShell>
    );
}
