"use client";
import React, { useState } from "react";
import { StudentRow } from "@/lib/types/student-affairs";

interface AbsenceModalProps {
    student: StudentRow | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (excuse: "بعذر" | "بدون عذر", note: string) => Promise<void>;
}

export function AbsenceModal({ student, isOpen, onClose, onSave }: AbsenceModalProps) {
    const [excuse, setExcuse] = useState<"بعذر" | "بدون عذر">("بدون عذر");
    const [note, setNote] = useState("");

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="mb-4 text-lg font-bold">تسجيل غياب: {student.name}</h3>

                <div className="mb-4 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="excuse"
                            checked={excuse === "بدون عذر"}
                            onChange={() => setExcuse("بدون عذر")}
                            className="accent-red-500"
                        />
                        <span className="text-sm">بدون عذر</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="excuse"
                            checked={excuse === "بعذر"}
                            onChange={() => setExcuse("بعذر")}
                            className="accent-emerald-500"
                        />
                        <span className="text-sm">بعذر</span>
                    </label>
                </div>

                <label className="mb-2 block text-sm text-zinc-400">ملاحظات (اختياري)</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-black/50 p-3 text-sm outline-none focus:border-emerald-500/50"
                    placeholder="مثال: ظرف عائلي..."
                    rows={3}
                />

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={() => onSave(excuse, note)}
                        className="rounded-xl bg-emerald-600 px-6 py-2 text-sm font-semibold hover:bg-emerald-500"
                    >
                        حفظ الغياب
                    </button>
                </div>
            </div>
        </div>
    );
}
