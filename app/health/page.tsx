"use client";

import { useState } from "react";
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
import { Stethoscope, Box, ClipboardCheck, FileText, Activity, ArrowUpRight } from "lucide-react";
import { AIInsightCard } from "@/components/ai/AIInsightCard";
import {
    PageHeader,
    DashboardGrid,
    MetricCard,
    DashboardSection,
    SegmentedTabs,
    type SegmentedTab,
} from "@/components/dashboard";

type HealthTab = "clinic" | "inventory" | "compliance" | "reports";

const TABS: SegmentedTab<HealthTab>[] = [
    { id: "clinic", label: "العيادة", icon: Stethoscope },
    { id: "inventory", label: "المخزون", icon: Box },
    { id: "compliance", label: "الامتثال", icon: ClipboardCheck },
    { id: "reports", label: "التقارير", icon: FileText },
];

export default function HealthPage() {
    const { state, actions } = useHealth();
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<HealthTab>("clinic");

    const studentsInClass = state.students.filter((s) => s.class_id === state.selectedClassId);

    const handleStudentClick = (student: { id: string; name: string }) => {
        setSelectedStudent(student);
        setIsVisitModalOpen(true);
    };

    return (
        <div className="space-y-8" dir="rtl">
            <PageHeader
                icon={Stethoscope}
                title="الصحة المدرسية"
                subtitle="العيادة والمخزون والامتثال الصحي وتقارير الجودة."
            />

            <SegmentedTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {state.msg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-bold text-success">
                    <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {state.msg}
                    </span>
                    <button
                        onClick={() => actions.setMsg("")}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        إغلاق
                    </button>
                </div>
            )}

            {/* KPI Strip */}
            <DashboardGrid cols={4}>
                <MetricCard label="زيارات اليوم" value={state.stats.visitsToday} icon={Stethoscope} tone="primary" />
                <MetricCard label="تحويلات خارجية" value={state.stats.referralsCount} icon={ArrowUpRight} tone="info" />
                <MetricCard label="نقص المخزون" value={state.stats.lowStockItems} icon={Box} tone={state.stats.lowStockItems > 0 ? "warning" : "success"} />
                <MetricCard label="إجمالي الزيارات" value={state.stats.totalVisits} icon={Activity} tone="primary" />
            </DashboardGrid>

            {/* AI Insight */}
            <AIInsightCard contextType="health_trend" title="الرؤية الذكية — الصحة المدرسية" />

            {/* Tab Content */}
            {activeTab === "clinic" && (
                <div className="space-y-8">
                    <DashboardSection title="سير عمل فحص الطلاب" icon={Stethoscope}>
                        <div className="space-y-6">
                            <ClassSelector
                                classes={state.classes}
                                selectedClassId={state.selectedClassId}
                                onSelect={actions.setSelectedClassId}
                            />
                            {state.selectedClassId && (
                                <StudentGrid students={studentsInClass} onStudentClick={handleStudentClick} />
                            )}
                        </div>
                    </DashboardSection>

                    <div className="grid gap-6 lg:grid-cols-12">
                        <div className="space-y-6 lg:col-span-4">
                            <VisitEntryForm students={state.students} onSubmit={actions.addVisit} />
                            <DashboardSection title="التحويلات الخارجية" icon={ArrowUpRight}>
                                <ReferralList referrals={state.referrals} />
                            </DashboardSection>
                        </div>
                        <div className="space-y-6 lg:col-span-8">
                            <DashboardSection title="سجل الزيارات اليومي" icon={Activity}>
                                <VisitLog visits={state.visits} />
                            </DashboardSection>
                            <AwarenessList awareness={state.awareness} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "inventory" && (
                <DashboardSection title="إدارة المخزون" icon={Box}>
                    <InventoryManager
                        supplies={state.supplies}
                        onUpdate={actions.updateSupply}
                        onAdd={actions.addSupplyItem}
                        onDelete={actions.deleteSupplyItem}
                    />
                </DashboardSection>
            )}

            {activeTab === "compliance" && (
                <DashboardSection title="الامتثال الصحي" icon={ClipboardCheck}>
                    <ComplianceManager
                        hygieneLogs={state.hygieneLogs}
                        canteenChecks={state.canteenChecks}
                        classes={state.classes}
                        onAddHygiene={(log) => actions.addHygieneLog(log as unknown as Parameters<typeof actions.addHygieneLog>[0])}
                        onAddCanteen={(check) => actions.addCanteenCheck(check as unknown as Parameters<typeof actions.addCanteenCheck>[0])}
                    />
                </DashboardSection>
            )}

            {activeTab === "reports" && (
                <DashboardSection title="إصدار التقارير الرسمية" icon={FileText}>
                    <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                        تُصدَّر النماذج الرسمية المعتمدة ضمن نظام الجودة (QF)، وتُضمَّن البيانات الصحية المسجّلة تلقائياً في التقرير لضمان الدقة والامتثال.
                    </p>
                    <ExportButtons state={state} />
                </DashboardSection>
            )}

            <LogVisitModal
                isOpen={isVisitModalOpen}
                onClose={() => setIsVisitModalOpen(false)}
                student={selectedStudent}
                className={state.classes.find((c) => c.id === state.selectedClassId)?.name}
                classId={state.selectedClassId}
                onSubmit={actions.addVisit}
            />
        </div>
    );
}
