"use client";
import React from "react";
import { ReferralInbox } from "./ReferralInbox";
import { BehavioralReferral } from "@/lib/types/student-affairs";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-stone-100 border border-stone-200 rounded-[2.5rem] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Pending Actions</p>
                        <h3 className="text-3xl font-black text-foreground italic">{stats.pending}</h3>
                    </div>
                    <div className="p-4 bg-[hsla(var(--accent-primary),.15)] text-[hsl(var(--accent-primary))] rounded-3xl border border-[hsla(var(--accent-primary),.25)]">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-stone-100 border border-stone-200 rounded-[2.5rem] p-6 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1">Resolved Today</p>
                        <h3 className="text-3xl font-black text-foreground italic">{stats.resolved}</h3>
                    </div>
                    <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-3xl border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* List View */}
            <div className="bg-white/80 border border-stone-200 rounded-[3rem] p-8 backdrop-blur-md">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-indigo-500 text-white rounded-3xl">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">منصة عمل المرشد الطلابي</h2>
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Counselor Workbench (Operational View)</p>
                    </div>
                </div>

                <ReferralInbox
                    referrals={counselorReferrals}
                    role="counselor"
                    onSend={() => { }} // Not used by counselor
                    onResolve={(id, action, notes) => {
                        onResolve(id, action, notes);
                    }}
                />
            </div>
        </div>
    );
}
