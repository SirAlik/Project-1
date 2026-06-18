"use client";

import { useState } from "react";
import { useSecretary } from "./_hooks/useSecretary";
import { CorrespondenceTable } from "./_components/CorrespondenceTable";
import { LeaveRequestForm } from "./_components/LeaveRequestForm";
import { QualityOwnerPanel } from "@/components/quality/QualityOwnerPanel";
import {
    PageHeader,
    DashboardGrid,
    DashboardSection,
    MetricCard,
    ActionCard,
    SegmentedTabs,
    type SegmentedTab,
} from "@/components/dashboard";
import {
    Mail,
    Users,
    Calendar,
    FileText,
    LayoutDashboard,
    CalendarDays,
    ClipboardList,
} from "lucide-react";

type SecretaryTab = "dashboard" | "correspondence" | "staff" | "reports";

const TABS: SegmentedTab<SecretaryTab>[] = [
    { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { id: "correspondence", label: "الصادر والوارد", icon: Mail },
    { id: "staff", label: "شؤون الموظفين", icon: Users },
    { id: "reports", label: "التقارير", icon: FileText },
];

export default function SecretaryPage() {
    const { state, actions } = useSecretary();
    const [tab, setTab] = useState<SecretaryTab>("dashboard");

    return (
        <div className="space-y-8" dir="rtl">
            <PageHeader
                icon={FileText}
                title="السكرتارية المدرسية"
                subtitle="المراسلات الرسمية وإجازات الموظفين والطلبات الإدارية."
            />

            {/* KPI Strip — بيانات حقيقية فقط */}
            {state.stats && (
                <DashboardGrid cols={4}>
                    <MetricCard label="وارد جديد" value={state.stats.incomingPending} icon={Mail} tone="danger" />
                    <MetricCard label="صادر (إجمالي)" value={state.stats.outgoingTotal} icon={FileText} tone="info" />
                    <MetricCard label="إجازات معلقة" value={state.stats.activeLeaves} icon={Calendar} tone="warning" />
                    <MetricCard label="في إجازة اليوم" value={state.stats.onLeaveToday} icon={Users} tone="primary" />
                </DashboardGrid>
            )}

            {state.msg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
                    <span>{state.msg}</span>
                    <button
                        onClick={() => actions.setMsg("")}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        إغلاق
                    </button>
                </div>
            )}

            <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === "dashboard" && (
                <div className="space-y-6">
                    <DashboardSection title="مركز القيادة الإداري" icon={LayoutDashboard}>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            تُدمج النماذج الرسمية في سير عملك اليومي — ابدأ بمعالجة البريد أو إدارة الإجازات.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                onClick={() => setTab("correspondence")}
                                className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                الصادر والوارد
                            </button>
                            <button
                                onClick={() => setTab("staff")}
                                className="rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                            >
                                شؤون الموظفين
                            </button>
                        </div>
                    </DashboardSection>

                    {/* روابط سريعة للأنظمة الفعلية */}
                    <DashboardGrid cols={3}>
                        <ActionCard
                            href="/secretary/staff-attendance"
                            icon={CalendarDays}
                            title="سجل الحضور"
                            description="تسجيل وإدارة حضور الموظفين — نظام متعدد المدارس."
                        />
                        <ActionCard
                            href="/secretary/hr-tickets"
                            icon={ClipboardList}
                            title="تذاكر المساءلة"
                            description="إدارة مساءلات الحضور وإطلاق مسارات الموافقة."
                        />
                        <ActionCard
                            href="/meetings"
                            icon={Calendar}
                            title="الاجتماعات"
                            description="جدولة الاجتماعات وإعداد المحاضر الرسمية."
                        />
                    </DashboardGrid>
                </div>
            )}

            {tab === "correspondence" && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-sm">
                    <CorrespondenceTable
                        letters={state.letters}
                        onAdd={actions.addLetter}
                        onUpdateStatus={actions.updateLetterStatus}
                        onDelete={actions.deleteLetter}
                    />
                </div>
            )}

            {tab === "staff" && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-sm">
                    <LeaveRequestForm
                        leaves={state.leaves}
                        onAdd={actions.addLeave}
                        onUpdateStatus={actions.updateLeaveStatus}
                    />
                </div>
            )}

            {tab === "reports" && (
                /* نماذج الجودة (مالك: سكرتير المدرسة) — السطح الحقيقي المُبوّب بسجلّ المستأجر (fail-closed) */
                <QualityOwnerPanel module="secretary" moduleLabel="السكرتارية" />
            )}
        </div>
    );
}
