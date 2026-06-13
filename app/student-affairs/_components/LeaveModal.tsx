"use client";
import React, { useState } from "react";
import { StudentRow } from "@/lib/types/student-affairs";

interface LeaveModalProps {
    student: StudentRow | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (reason: string) => Promise<void>;
}

export function LeaveModal({ student, isOpen, onClose, onSave }: LeaveModalProps) {
    const [reason, setReason] = useState("");

    if (!isOpen || !student) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-200/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-bold">تسجيل استئذان: {student.name}</h3>

                <label className="mb-2 block text-sm text-stone-500">سبب الاستئذان</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-200/70 p-3 text-sm outline-none focus:border-emerald-500/50"
                    placeholder="اكتب السبب..."
                    rows={3}
                />

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={() => onSave(reason)}
                        className="rounded-xl bg-[hsl(var(--accent-primary))] px-6 py-2 text-sm font-semibold hover:bg-[hsl(var(--accent-primary))]"
                    >
                        حفظ الاستئذان
                    </button>
                </div>
            </div>
        </div>
    );
}
