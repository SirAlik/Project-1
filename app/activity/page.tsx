"use client";

import React, { useState } from "react";
import {
    Wallet,
    Layers,
    Heart,
    Calendar as CalendarIcon,
    Sparkles,
    Users,
    Trophy,
    Calendar,
    FileText
} from "lucide-react";
import { useActivities } from "@/app/activity/_hooks/useActivities";
import { FinancialDashboard } from "./_components/FinancialDashboard";
import { ClubManager } from "./_components/ClubManager";
import { StudentEngagement } from "./_components/StudentEngagement";
import { EventManager } from "./_components/EventManager";
import { ExportButtons } from "./_components/ExportButtons";
import { KPICard } from "@/components/ui/KPICard";
import { RoleDashboardShell } from "@/components/layout/RoleDashboardShell";

export default function ActivityLeaderPage() {
    const { state, actions } = useActivities();
    type ActivityTab = "financial" | "clubs" | "students" | "events" | "reports";
    const [activeTab, setActiveTab] = useState<ActivityTab>("financial");

    return (
        <RoleDashboardShell role="activity_leader">
        <main className="text-[var(--text)] font-sans" dir="rtl">
            <div className="relative z-10 pb-24">
                {/* Modern Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight">
                            وحدة رائد <span className="text-[hsl(var(--gold))]">النشاط</span>
                        </h1>
                    </div>

                    <nav className="flex p-1.5 glass-panel rounded-3xl overflow-hidden border">
                        {[
                            { id: "financial", icon: Wallet, label: "المالية" },
                            { id: "clubs", icon: Layers, label: "الأندية" },
                            { id: "students", icon: Heart, label: "المشاركة" },
                            { id: "events", icon: CalendarIcon, label: "الفعاليات" },
                            { id: "reports", icon: FileText, label: "التقارير" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as ActivityTab)}
                                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-white text-[hsl(var(--gold))] shadow-xl"
                                    : "opacity-40 hover:opacity-100"
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </header>

                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <KPICard
                        title="استهلاك الميزانية"
                        value={`%${state.stats.expenseRatio.toFixed(1)}`}
                        icon={Wallet}
                        color="primary"
                    />
                    <KPICard
                        title="الأندية النشطة"
                        value={state.stats.activeClubs}
                        icon={Users}
                        color="primary"
                    />
                    <KPICard
                        title="الطلاب المكرمون"
                        value={state.stats.honoredStudents}
                        icon={Trophy}
                        color="accent"
                    />
                    <KPICard
                        title="الفعاليات القادمة"
                        value={state.stats.upcomingEvents}
                        icon={Calendar}
                        color="accent"
                    />
                </div>

                {/* Feedback Message */}
                {state.msg && (
                    <div className="mb-8 p-4 glass-panel border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-4 h-4 shadow-pulse" />
                            {state.msg}
                        </div>
                        <button onClick={() => actions.setMsg("")} className="opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
                    </div>
                )}

                {/* Functional Sections */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
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
                            <div className="p-12 text-center">
                                <ExportButtons data={state} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
        </RoleDashboardShell>
    );
}
