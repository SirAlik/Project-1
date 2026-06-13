"use client";

import React, { useState } from "react";
import { useHealth } from "./_hooks/useHealth";
import { VisitLog } from "./_components/VisitLog";
import { VisitEntryForm } from "./_components/VisitEntryForm";
import { ReferralList } from "./_components/ReferralList";
import { AwarenessList } from "./_components/AwarenessList";
import { ClassSelector } from "./_components/ClassSelector";
import { StudentGrid } from "./_components/StudentGrid";
import { LogVisitModal } from "./_components/LogVisitModal";
import { ExportButtons } from "./_components/ExportButtons";
import { InventoryManager } from "./_components/InventoryManager";
import { ComplianceManager } from "./_components/ComplianceManager";
import { Card } from "@/components/ui/Card";
import {
    Stethoscope,
    Box,
    ClipboardCheck,
    FileText,
    Activity,
    ArrowUpRight
} from "lucide-react";


import { KPICard } from "@/components/ui/KPICard";
import { AIInsightCard } from "@/components/ai/AIInsightCard";

export default function HealthPage() {
    const { state, actions } = useHealth();
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"clinic" | "inventory" | "compliance" | "reports">("clinic");

    const studentsInClass = state.students.filter(s => s.class_id === state.selectedClassId);

    const handleStudentClick = (student: { id: string; name: string }) => {
        setSelectedStudent(student);
        setIsVisitModalOpen(true);
    };

    return (
        <main className="text-[var(--text)] font-sans pb-20" dir="rtl">
            <div className="relative z-10">
                <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">
                            الموجّه <span className="text-[var(--primary)]">الصحي</span>
                        </h1>
                    </div>

                    {/* Main Tabs Navigation */}
                    <nav className="flex p-1.5 glass-panel rounded-3xl overflow-hidden border">
                        {[
                            { id: "clinic", label: "العيادة", icon: <Stethoscope className="w-4 h-4" /> },
                            { id: "inventory", label: "المخزون", icon: <Box className="w-4 h-4" /> },
                            { id: "compliance", label: "الامتثال", icon: <ClipboardCheck className="w-4 h-4" /> },
                            { id: "reports", label: "التقارير", icon: <FileText className="w-4 h-4" /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as "clinic" | "inventory" | "compliance" | "reports")}
                                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-white text-[var(--primary)] shadow-xl"
                                    : "opacity-40 hover:opacity-100"
                                    }`}
                            >
                                <span className={activeTab === tab.id ? 'animate-pulse' : ''}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                {state.msg && (
                    <div className="mb-8 p-4 glass-panel border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-2xl animate-in fade-in slide-in-from-top-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 shadow-pulse" />
                            {state.msg}
                        </div>
                        <button onClick={() => actions.setMsg("")} className="opacity-40 hover:opacity-100 transition-opacity">إغلاق</button>
                    </div>
                )}

                {/* KPI Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <KPICard title="زيارات اليوم" value={state.stats.visitsToday} color="primary" icon={Stethoscope} />
                    <KPICard title="تحويلات خارجية" value={state.stats.referralsCount} color="accent" icon={ArrowUpRight} />
                    <KPICard title="نقص المخزون" value={state.stats.lowStockItems} trend={state.stats.lowStockItems > 0 ? "down" : "up"} color="accent" icon={Box} />
                    <KPICard title="إجمالي الزيارات" value={state.stats.totalVisits} color="primary" icon={Activity} />
                </div>

                {/* AI Insight */}
                <div className="mb-10">
                    <AIInsightCard contextType="health_trend" title="الرؤية الذكية — الصحة المدرسية" />
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="glass-panel p-1 rounded-[2.5rem] border overflow-hidden">
                        {activeTab === "clinic" && (
                            <div className="p-8 space-y-12">
                                {/* Workflow Step 1 */}
                                <section className="space-y-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 text-[var(--primary)] font-bold text-lg">١</div>
                                        <h2 className="text-xl font-bold">سير عمل فحص الطلاب</h2>
                                    </div>

                                    <div className="glass-card p-6">
                                        <ClassSelector
                                            classes={state.classes}
                                            selectedClassId={state.selectedClassId}
                                            onSelect={actions.setSelectedClassId}
                                        />
                                    </div>

                                    {state.selectedClassId && (
                                        <StudentGrid
                                            students={studentsInClass}
                                            onStudentClick={handleStudentClick}
                                        />
                                    )}
                                </section>

                                {/* Section 2: Logs & Forms */}
                                <div className="grid gap-8 lg:grid-cols-12">
                                    <div className="lg:col-span-4 space-y-8">
                                        <VisitEntryForm
                                            students={state.students}
                                            onSubmit={actions.addVisit}
                                        />
                                        <Card title="التحويلات الخارجية">
                                            <ReferralList referrals={state.referrals} />
                                        </Card>
                                    </div>
                                    <div className="lg:col-span-8 space-y-8">
                                        <Card title="سجل الزيارات اليومي">
                                            <VisitLog visits={state.visits} />
                                        </Card>
                                        <AwarenessList awareness={state.awareness} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "inventory" && (
                            <div className="p-12 max-w-5xl mx-auto">
                                <InventoryManager
                                    supplies={state.supplies}
                                    onUpdate={actions.updateSupply}
                                    onAdd={actions.addSupplyItem}
                                    onDelete={actions.deleteSupplyItem}
                                />
                            </div>
                        )}

                        {activeTab === "compliance" && (
                            <div className="p-12 max-w-5xl mx-auto space-y-8">
                                <ComplianceManager
                                    hygieneLogs={state.hygieneLogs}
                                    canteenChecks={state.canteenChecks}
                                    classes={state.classes}
                                    onAddHygiene={(log) => actions.addHygieneLog(log as unknown as Parameters<typeof actions.addHygieneLog>[0])}
                                    onAddCanteen={(check) => actions.addCanteenCheck(check as unknown as Parameters<typeof actions.addCanteenCheck>[0])}
                                />
                            </div>
                        )}

                        {activeTab === "reports" && (
                            <div className="p-12 max-w-3xl mx-auto text-center space-y-10">
                                <h2 className="text-3xl font-bold italic">إصدار التقارير الرسمية</h2>
                                <div className="glass-card p-10 border-b-4 border-b-[var(--primary)]">
                                    <div className="w-20 h-20 glass-panel rounded-3xl mb-8 flex items-center justify-center mx-auto border-t">
                                        <FileText className="w-10 h-10 text-[var(--primary)]" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-4">نظام تقارير الجودة (QF Series)</h3>
                                    <p className="opacity-60 text-sm leading-relaxed mb-10">
                                        يمكنك تصدير كافة النماذج الرسمية المعتمدة ضمن نظام الجودة QF. يتم تضمين كافة البيانات الصحية المسجلة تلقائياً في التقرير لضمان الدقة والامتثال.
                                    </p>
                                    <ExportButtons state={state} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <LogVisitModal
                isOpen={isVisitModalOpen}
                onClose={() => setIsVisitModalOpen(false)}
                student={selectedStudent}
                className={state.classes.find(c => c.id === state.selectedClassId)?.name}
                classId={state.selectedClassId}
                onSubmit={actions.addVisit}
            />
        </main>
    );
}

