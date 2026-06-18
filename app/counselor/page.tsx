"use client";

import { useState } from "react";
import { useCounselor } from "./_hooks/useCounselor";
import { CaseList } from "./_components/CaseList";
import { SessionList } from "./_components/SessionList";
import { QualityForms } from "./_components/QualityForms";
import { TabKey } from "@/lib/types/counselor";
import { DisciplineKnightsModal } from "@/components/operations/DisciplineKnightsModal";
import {
    Trophy,
    BookOpen,
    ClipboardCheck,
    LayoutDashboard,
    RefreshCw,
    Heart,
    PieChart,
    ShieldCheck,
} from "lucide-react";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import {
    PageHeader,
    DashboardGrid,
    MetricCard,
    SegmentedTabs,
    type SegmentedTab,
} from "@/components/dashboard";

const TABS: SegmentedTab<TabKey>[] = [
    { id: "المعاملات", label: "المعاملات", icon: LayoutDashboard },
    { id: "الجلسات", label: "الجلسات", icon: BookOpen },
    { id: "quality", label: "نماذج الجودة", icon: ClipboardCheck },
];

export default function CounselorPage() {
    const { state, helpers, actions } = useCounselor();
    const [tab, setTab] = useState<TabKey>("المعاملات");
    const [isKnightsOpen, setIsKnightsOpen] = useState(false);

    const { msg, loading, user, currentUserName } = state;

    return (
        <div className="space-y-8" dir="rtl">
            <PageHeader
                icon={Heart}
                title="واجهة الموجه الطلابي"
                subtitle={`أهلاً، ${currentUserName ?? "الموجه"} • لوحة تحكم إرشادية`}
                actions={
                    <>
                        <button
                            onClick={() => setIsKnightsOpen(true)}
                            className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                        >
                            <Trophy className="h-4 w-4 text-primary" /> فرسان الانضباط
                        </button>
                        <button
                            onClick={actions.reloadAll}
                            title="تحديث"
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => (window.location.href = "/classroom")}
                            className="rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                        >
                            رجوع للكلاسروم
                        </button>
                    </>
                }
            />

            {msg && (
                <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-bold text-success">
                    {msg}
                </div>
            )}

            {state.stats && (
                <DashboardGrid cols={4}>
                    <MetricCard label="الحالات النشطة" value={state.stats.activeCases} icon={ClipboardCheck} tone="danger" />
                    <MetricCard label="جلسات هذا الشهر" value={state.stats.sessionsThisMonth} icon={BookOpen} tone="info" />
                    <MetricCard label="الاعتمادات المعلقة" value={state.stats.pendingReports} icon={ShieldCheck} tone="warning" />
                    <MetricCard label="إجمالي المعاملات" value={state.stats.totalCases} icon={PieChart} tone="primary" />
                </DashboardGrid>
            )}

            {/* AI Insight */}
            <AIInsightCard contextType="behavior_pattern" title="الرؤية الذكية — التوجيه الطلابي" />

            <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />

            {tab === "المعاملات" && (
                <CaseList
                    cases={state.cases}
                    studentsList={state.studentsList}
                    classesList={state.classesList}
                    studentNameById={helpers.studentNameById}
                    classNameById={helpers.classNameById}
                    createCaseManual={actions.createCaseManual}
                />
            )}

            {tab === "الجلسات" && (
                <SessionList
                    sessions={state.sessions}
                    studentsList={state.studentsList}
                    classesList={state.classesList}
                    studentNameById={helpers.studentNameById}
                    classNameById={helpers.classNameById}
                    addSession={actions.addSession}
                />
            )}

            {tab === "quality" && (
                <QualityForms
                    studentsList={state.studentsList}
                    classesList={state.classesList}
                    cases={state.cases}
                    getAbsenceCount={helpers.getAbsenceCount}
                    user={user ?? undefined}
                    userName={currentUserName}
                />
            )}

            <DisciplineKnightsModal
                isOpen={isKnightsOpen}
                onClose={() => setIsKnightsOpen(false)}
                userRole="student_counselor"
            />
        </div>
    );
}
