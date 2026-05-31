import React from "react";
import { CorrespondenceRow, LeaveRow } from "@/lib/types/secretary";

interface Props {
    letters: CorrespondenceRow[];
    leaves: LeaveRow[];
}

export function StatsCards({ letters, leaves }: Props) {
    const incoming = letters.filter(l => l.type === "incoming").length;
    const outgoing = letters.filter(l => l.type === "outgoing").length;
    const pendingLeaves = leaves.filter(l => l.status === "pending").length;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/10 backdrop-blur-sm">
                <div className="text-sm text-zinc-400">الوارد (الكلي)</div>
                <div className="text-3xl font-bold text-emerald-400 mt-1">{incoming}</div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-500/10 backdrop-blur-sm">
                <div className="text-sm text-zinc-400">الصادر (الكلي)</div>
                <div className="text-3xl font-bold text-blue-400 mt-1">{outgoing}</div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[hsla(var(--gold),.10)] to-[hsla(var(--gold-strong),.10)] border border-[hsla(var(--gold),.20)] backdrop-blur-sm">
                <div className="text-sm text-zinc-400">إجازات معلقة</div>
                <div className="text-3xl font-bold text-[hsl(var(--gold))] mt-1">{pendingLeaves}</div>
            </div>
        </div>
    );
}
