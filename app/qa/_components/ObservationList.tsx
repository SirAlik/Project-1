import React from "react";
import { QAObservation } from "@/lib/types/qa";
import { Card } from "@/components/ui/Card";

export function ObservationList({ observations }: { observations: QAObservation[] }) {
    if (observations.length === 0) return <div className="text-stone-500">No observations yet.</div>;

    return (
        <Card title="أحدث الزيارات الصفية">
            <div className="space-y-3">
                {observations.map(obs => (
                    <div key={obs.id} className="p-3 rounded-lg bg-white/80 border border-stone-200 flex justify-between items-center hover:bg-stone-100/80 transition">
                        <div>
                            <div className="font-bold text-stone-700">{obs.teacher_name || "Unknown Teacher"}</div>
                            <div className="text-xs text-stone-500">{obs.class_name} | {new Date(obs.date).toLocaleDateString("ar-SA")}</div>
                        </div>
                        <div className="text-right">
                            <div className={`text-lg font-bold ${obs.overall_score >= 90 ? 'text-emerald-400' : 'text-[hsl(var(--gold))]'}`}>
                                {obs.overall_score}%
                            </div>
                            <div className="text-[10px] text-stone-500">التقييم العام</div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
