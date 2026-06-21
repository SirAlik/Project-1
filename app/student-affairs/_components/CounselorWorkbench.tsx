"use client";
import React from "react";
import { ReferralInbox } from "./ReferralInbox";
import { BehavioralReferral } from "@/lib/types/student-affairs";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { DashboardGrid, MetricCard, DashboardSection } from "@/components/dashboard";

interface CounselorWorkbenchProps {
    referrals: BehavioralReferral[];
    onResolve: (id: string, action: string, notes?: string) => void;
}

export function CounselorWorkbench({ referrals, onResolve }: CounselorWorkbenchProps) {

    // Filter referrals for counselor (those sent from VP and already resolved ones)
    const counselorReferrals = referrals.filter(r =>
        r.status === 'pending_counselor' || r.status === 'resolved' || r.status === 'in_progress'
    );

    const stats = {
        pending: counselorReferrals.filter(r => r.status === 'pending_counselor').length,
        resolved: counselorReferrals.filter(r => r.status === 'resolved').length
    };

    return (
        <div className="space-y-6">
            {/* Counselor Stats Header */}
            <DashboardGrid cols={2}>
                <MetricCard label="إجراءات معلّقة" value={stats.pending} icon={Clock} tone="warning" />
                <MetricCard label="محلولة اليوم" value={stats.resolved} icon={CheckCircle2} tone="success" />
            </DashboardGrid>

            {/* List View */}
            <DashboardSection title="منصة عمل المرشد الطلابي" icon={ClipboardList}>
                <ReferralInbox
                    referrals={counselorReferrals}
                    role="counselor"
                    onSend={() => { }} // Not used by counselor
                    onResolve={(id, action, notes) => {
                        onResolve(id, action, notes);
                    }}
                />
            </DashboardSection>
        </div>
    );
}
