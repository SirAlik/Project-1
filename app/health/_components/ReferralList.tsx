import React from "react";
import { HealthReferral } from "@/lib/types/health";

export function ReferralList({ referrals }: { referrals: HealthReferral[] }) {
    if (referrals.length === 0) return <div className="text-zinc-500 text-sm">لا توجد تحويلات خارجية.</div>;

    return (
        <div className="space-y-2">
            {referrals.map(r => (
                <div key={r.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 flex justify-between">
                    <div>
                        <div className="text-sm font-bold text-zinc-300">{r.student_name}</div>
                        <div className="text-xs text-zinc-500">إلى: {r.destination}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleDateString("ar-SA")}</div>
                        {r.parent_notified && <span className="text-[10px] bg-green-900/30 text-green-400 px-1 rounded">تم إشعار الأهل</span>}
                    </div>
                </div>
            ))}
        </div>
    );
}
