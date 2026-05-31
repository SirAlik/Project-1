import React, { useState } from "react";
import { Experiment } from "@/lib/types/science";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (date: string, period: number, experimentId?: string) => Promise<boolean>;
    experiments: Experiment[];
}

export function RequestModal({ isOpen, onClose, onSubmit, experiments }: Props) {
    const [date, setDate] = useState("");
    const [period, setPeriod] = useState(1);
    const [expId, setExpId] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const ok = await onSubmit(date, period, expId || undefined);
        setLoading(false);
        if (ok) onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
                    حجز المختبر
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">التاريخ</label>
                        <input
                            type="date" required
                            value={date} onChange={e => setDate(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm outline-none focus:border-cyan-500/50"
                            aria-label="التاريخ"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">الحصة</label>
                        <select
                            value={period} onChange={e => setPeriod(Number(e.target.value))}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm outline-none focus:border-cyan-500/50"
                            aria-label="الحصة"
                        >
                            {[1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={p}>الحصة {p}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">التجربة (اختياري)</label>
                        <select
                            value={expId} onChange={e => setExpId(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm outline-none focus:border-cyan-500/50"
                            title="التجربة"
                        >
                            <option value="">-- بدون تجربة محددة --</option>
                            {experiments.map(exp => (
                                <option key={exp.id} value={exp.id}>{exp.title} (G{exp.grade_level})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="text-zinc-400 text-sm hover:text-white transition">إلغاء</button>
                        <button
                            type="submit" disabled={loading}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all"
                        >
                            {loading ? "جاري الحجز..." : "تأكيد الحجز"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
