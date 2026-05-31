import React from "react";
import { HealthVisit } from "@/lib/types/health";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function VisitLog({ visits }: { visits: HealthVisit[] }) {
    if (visits.length === 0) return <div className="text-zinc-500 text-sm">لا توجد زيارات مسجلة اليوم.</div>;

    return (
        <div className="space-y-3">
            {visits.map(v => (
                <div key={v.id} className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 flex justify-between items-center hover:bg-zinc-800/50 transition">
                    <div>
                        <div className="font-bold text-zinc-200 text-sm">{v.student_name || "طالب"}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                            السبب: {v.visit_reason || "غير محدد"} | الشكوى: {v.complaint} | الإجراء: {v.action_taken}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-zinc-500">{new Date(v.created_at).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}</span>
                        <StatusBadge status={v.status === 'completed' ? 'منجز' : 'تحويل'} />
                    </div>
                </div>
            ))}
        </div>
    );
}
