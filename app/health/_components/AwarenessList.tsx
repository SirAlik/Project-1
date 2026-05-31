import React from "react";
import { HealthAwareness } from "@/lib/types/health";
import { Card } from "@/components/ui/Card";

export function AwarenessList({ awareness }: { awareness: HealthAwareness[] }) {
    return (
        <Card title="التوعية والثقيف الصحي">
            <div className="space-y-4">
                {awareness.map(a => (
                    <div key={a.id} className="relative border-r-2 border-rose-500 pr-4">
                        <div className="text-sm font-bold text-zinc-200">{a.title}</div>
                        <div className="text-xs text-zinc-400 mb-1">{new Date(a.date).toLocaleDateString("ar-SA")} | الفئة: {a.target_audience}</div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{a.description}</p>
                        <div className="absolute -right-[5px] top-0 w-2 h-2 rounded-full bg-rose-500"></div>
                    </div>
                ))}
                {awareness.length === 0 && <div className="text-zinc-500 text-sm">لا توجد أنشطة مسجلة.</div>}
            </div>
        </Card>
    );
}
