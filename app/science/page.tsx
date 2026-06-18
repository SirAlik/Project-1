"use client";

import { useState } from "react";
import { useScience } from "./_hooks/useScience";
import { InventoryList } from "./_components/InventoryList";
import { BookingList } from "./_components/BookingList";
import { RequestModal } from "./_components/RequestModal";
import { QualityOwnerPanel } from "@/components/quality/QualityOwnerPanel";
import {
    PageHeader,
    DashboardSection,
    DashboardGrid,
    MetricCard,
    SegmentedTabs,
    type SegmentedTab,
} from "@/components/dashboard";
import { TestTube2, Calendar, Box, ShieldCheck, Info, Plus, X } from "lucide-react";

type LabTab = "bookings" | "inventory";

const TABS: SegmentedTab<LabTab>[] = [
    { id: "bookings", label: "سجل الحجوزات", icon: Calendar },
    { id: "inventory", label: "المخزون والأدوات", icon: Box },
];

export default function SciencePage() {
    const { state, actions } = useScience();
    const [tab, setTab] = useState<LabTab>("bookings");
    const [showModal, setShowModal] = useState(false);

    const pendingCount = state.bookings.filter((b) => b.status === "pending").length;
    const approvedCount = state.bookings.filter((b) => b.status === "approved").length;

    return (
        <div className="space-y-8" dir="rtl">
            <PageHeader
                icon={TestTube2}
                title="المختبر العلمي"
                subtitle="حجوزات المختبر والمخزون وسجلّات الجودة."
                actions={
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" /> حجز جديد
                    </button>
                }
            />

            <SegmentedTabs tabs={TABS} active={tab} onChange={setTab} />

            {state.msg && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {state.msg}
                    </span>
                    <button
                        onClick={() => actions.setMsg("")}
                        aria-label="إغلاق"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {tab === "bookings" && (
                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <DashboardSection title="الحجوزات القادمة" icon={Calendar}>
                            <BookingList bookings={state.bookings} />
                        </DashboardSection>
                    </div>
                    <div className="space-y-6 lg:col-span-4">
                        <DashboardGrid cols={2}>
                            <MetricCard label="قيد الانتظار" value={pendingCount} icon={TestTube2} tone="warning" />
                            <MetricCard label="مؤكد" value={approvedCount} icon={ShieldCheck} tone="success" />
                        </DashboardGrid>
                        <DashboardSection title="تعليمات المختبر" icon={Info}>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    يجب الحجز قبل ٢٤ ساعة على الأقل.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    تأكد من توفر المواد الكيميائية المطلوبة.
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    اتبع إجراءات السلامة دائماً.
                                </li>
                            </ul>
                        </DashboardSection>
                    </div>
                </div>
            )}

            {tab === "inventory" && (
                <DashboardSection title="المخزون والأدوات" icon={Box}>
                    <InventoryList items={state.inventory} />
                </DashboardSection>
            )}

            {/* نماذج الجودة (مالك: محضر المختبر) — مُبوّبة بسجلّ المستأجر */}
            <QualityOwnerPanel module="science" moduleLabel="المختبر العلمي" />

            <RequestModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={actions.requestBooking}
                experiments={state.experiments}
            />
        </div>
    );
}
