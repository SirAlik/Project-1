"use client";

import { useState } from "react";
import {
    Wallet,
    Layers,
    Heart,
    Calendar as CalendarIcon,
    Users,
    Trophy,
    Calendar,
    FileText,
    Star,
} from "lucide-react";
import { useActivities } from "@/app/activity/_hooks/useActivities";
import { FinancialDashboard } from "./_components/FinancialDashboard";
import { ClubManager } from "./_components/ClubManager";
import { StudentEngagement } from "./_components/StudentEngagement";
import { EventManager } from "./_components/EventManager";
import { ExportButtons } from "./_components/ExportButtons";
import { RoleDashboardShell } from "@/components/layout/RoleDashboardShell";
import {
    PageHeader,
    DashboardGrid,
    MetricCard,
    SegmentedTabs,
    type SegmentedTab,
} from "@/components/dashboard";

type ActivityTab = "financial" | "clubs" | "students" | "events" | "reports";

const TABS: SegmentedTab<ActivityTab>[] = [
    { id: "financial", label: "المالية", icon: Wallet },
    { id: "clubs", label: "الأندية", icon: Layers },
    { id: "students", label: "المشاركة", icon: Heart },
    { id: "events", label: "الفعاليات", icon: CalendarIcon },
    { id: "reports", label: "التقارير", icon: FileText },
];

export default function ActivityLeaderPage() {
    const { state, actions } = useActivities();
    const [activeTab, setActiveTab] = useState<ActivityTab>("financial");

    return (
        <RoleDashboardShell role="activity_leader">
            <div className="space-y-8" dir="rtl">
                <PageHeader
                    icon={Star}
                    title="وحدة رائد النشاط"
                    subtitle="الأندية والفعاليات والميزانية وتكريم الطلاب."
                />

                <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

                {/* KPI Row */}
                <DashboardGrid cols={4}>
                    <MetricCard label="استهلاك الميزانية" value={`%${state.stats.expenseRatio.toFixed(1)}`} icon={Wallet} tone="primary" />
                    <MetricCard label="الأندية النشطة" value={state.stats.activeClubs} icon={Users} tone="info" />
                    <MetricCard label="الطلاب المكرمون" value={state.stats.honoredStudents} icon={Trophy} tone="success" />
                    <MetricCard label="الفعاليات القادمة" value={state.stats.upcomingEvents} icon={Calendar} tone="warning" />
                </DashboardGrid>

                {/* Feedback Message */}
                {state.msg && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-bold text-success">
                        <span>{state.msg}</span>
                        <button
                            onClick={() => actions.setMsg("")}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                            إغلاق
                        </button>
                    </div>
                )}

                {/* Functional Sections */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-sm">
                    {activeTab === "financial" && (
                        <FinancialDashboard
                            financials={state.financials}
                            stats={state.stats}
                            onAddBudget={actions.addBudgetItem}
                            onAddExpense={actions.addExpense}
                            onDelete={actions.deleteFinancial}
                        />
                    )}

                    {activeTab === "clubs" && (
                        <ClubManager
                            clubs={state.clubs}
                            assignments={state.assignments}
                            evaluations={state.evaluations}
                            teachers={state.teachers}
                            onAddClub={actions.addClub}
                            onAssignTeacher={actions.assignTeacher}
                            onEvaluate={actions.evaluatePerformance}
                        />
                    )}

                    {activeTab === "students" && (
                        <StudentEngagement
                            wishes={state.wishes}
                            honors={state.honors}
                            trips={state.trips}
                            consents={state.consents}
                            clubs={state.clubs}
                            students={state.students}
                            classes={state.classes}
                            onSubmitWish={actions.submitWish}
                            onAward={actions.awardStudent}
                            onCreateTrip={actions.createTrip}
                        />
                    )}

                    {activeTab === "events" && (
                        <EventManager
                            events={state.events}
                            onAddEvent={actions.scheduleEvent}
                            onUpdateEvent={actions.updateEvent}
                            onDeleteEvent={actions.deleteEvent}
                        />
                    )}

                    {activeTab === "reports" && (
                        <div className="p-8 text-center">
                            <ExportButtons data={state} />
                        </div>
                    )}
                </div>
            </div>
        </RoleDashboardShell>
    );
}
