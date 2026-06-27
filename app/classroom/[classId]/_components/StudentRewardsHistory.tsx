"use client";

import { useEffect, useState, startTransition } from "react";
import { Star, Award, Plus, Loader2 } from "lucide-react";
import { getStudentRewardsHistoryAction, type RewardHistoryRow } from "@/app/classroom/_actions";

const TYPE_META: Record<RewardHistoryRow["reward_type"], { label: string; icon: typeof Star; color: string }> = {
    star: { label: "نجمة", icon: Star, color: "text-[var(--primary)]" },
    positive_point: { label: "نقطة إيجابية", icon: Plus, color: "text-[var(--primary)]" },
    badge: { label: "وسام", icon: Award, color: "text-[var(--accent)]" },
};

// سجلّ مكافآت/أوسمة الطالب — قراءة فقط من classroom_rewards (بيانات حقيقية فقط).
// يُركَّب بـ key={studentId} في الأب → loading يبدأ true من useState (بلا setState في بداية الـeffect).
export function StudentRewardsHistory({ studentId, studentName }: { studentId: string; studentName: string }) {
    const [rows, setRows] = useState<RewardHistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        startTransition(async () => {
            let res: Awaited<ReturnType<typeof getStudentRewardsHistoryAction>> | null = null;
            try { res = await getStudentRewardsHistoryAction(studentId); } catch { res = null; }
            if (cancelled) return;
            if (!res || !res.ok) { setError(res?.error ?? "تعذّر تحميل السجل"); setRows([]); }
            else { setError(null); setRows(res.data ?? []); }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [studentId]);

    return (
        <div className="mb-6 p-4 rounded-2xl bg-white/80 border border-stone-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-3">
                سجل المكافآت والأوسمة — {studentName}
            </p>

            {loading ? (
                <div className="flex items-center gap-2 text-stone-400 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> جارٍ التحميل…
                </div>
            ) : error ? (
                <p className="text-xs font-bold text-[var(--danger)]">{error}</p>
            ) : rows.length === 0 ? (
                <p className="text-xs text-stone-400">لا توجد مكافآت أو أوسمة مسجلة لهذا الطالب بعد.</p>
            ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {rows.map((r) => {
                        const meta = TYPE_META[r.reward_type] ?? TYPE_META.positive_point;
                        const Icon = meta.icon;
                        return (
                            <li key={r.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-black text-stone-700 truncate">{r.label}</p>
                                    <p className="text-[9px] text-stone-400">
                                        {meta.label}
                                        {r.class_name ? ` · ${r.class_name}` : ""}
                                        {r.created_by_name ? ` · ${r.created_by_name}` : ""}
                                        {` · ${r.reward_date}`}
                                    </p>
                                </div>
                                {r.points !== 0 && (
                                    <span className="text-[10px] font-black text-[var(--primary)] shrink-0">+{r.points}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
