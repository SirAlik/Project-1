import React, { useState } from "react";

interface Props {
    isOpen: boolean;
    studentName: string;
    onClose: () => void;
    onSend: (reason: string) => Promise<boolean>;
}

export function ReferralModal({ isOpen, studentName, onClose, onSend }: Props) {
    const [reason, setReason] = useState("");
    const [sending, setSending] = useState(false);

    if (!isOpen) return null;

    async function handleSend() {
        setSending(true);
        const success = await onSend(reason);
        setSending(false);
        if (success) setReason("");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-rose-500/20 bg-zinc-950 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-red-500 bg-clip-text text-transparent">
                    تحويل الطالب إلى الوكيل
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                    الطالب: <span className="font-semibold text-zinc-200">{studentName}</span>
                </p>

                <label className="mt-6 block text-sm text-zinc-300 mb-2">سبب التحويل</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all"
                    rows={4}
                    placeholder="اكتب سبب التحويل بالتفصيل..."
                    autoFocus
                />

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-2 text-sm font-bold text-white shadow-lg hover:shadow-rose-600/20 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {sending ? "جاري الإرسال (waiting)..." : "إرسال التحويل"}
                    </button>
                </div>
            </div>
        </div>
    );
}
