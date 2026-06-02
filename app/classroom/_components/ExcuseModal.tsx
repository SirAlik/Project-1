import React, { useState } from "react";

interface Props {
    isOpen: boolean;
    studentName: string;
    onClose: () => void;
    onSend: (note: string) => Promise<boolean>;
}

export function ExcuseModal({ isOpen, studentName, onClose, onSend }: Props) {
    const [note, setNote] = useState("");

    if (!isOpen) return null;

    async function handleSend() {
        const success = await onSend(note);
        if (success) setNote("");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-200/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-blue-500/20 bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-blue-400">
                    تسجيل استئذان
                </h3>
                <p className="mt-2 text-sm text-stone-500">
                    الطالب: <span className="font-semibold text-stone-700">{studentName}</span>
                </p>

                <label className="mt-6 block text-sm text-stone-600 mb-2">ملاحظة الاستئذان</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-100 p-4 text-sm text-stone-700 placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    rows={3}
                    placeholder="سبب الخروج..."
                    autoFocus
                />

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 hover:bg-white/5 transition-all"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSend}
                        className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-foreground shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
                    >
                        تسجيل
                    </button>
                </div>
            </div>
        </div>
    );
}
