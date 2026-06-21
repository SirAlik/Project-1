"use client";
import React, { useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface ActionRecorderProps {
    referralId: string;
    studentName: string;
    isOpen: boolean;
    onClose: () => void;
    onRecord: (id: string, action: string, notes?: string) => void;
}

export function ActionRecorder({ referralId, studentName, isOpen, onClose, onRecord }: ActionRecorderProps) {
    const [action, setAction] = useState("");
    const [notes, setNotes] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground">تسجيل إجراء إرشادي</h3>
                            <p className="text-[11px] font-bold text-muted-foreground">{studentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="إغلاق النافذة">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="px-1 text-[11px] font-bold text-muted-foreground">الإجراء المتخذ</label>
                        <textarea
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            required
                            className="min-h-[100px] w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success/40"
                            placeholder="اوصف الإجراء الإرشادي المتخذ..."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="px-1 text-[11px] font-bold text-muted-foreground">ملاحظات إضافية (اختياري)</label>
                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-success/40"
                            placeholder="تفاصيل إضافية..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={() => {
                                if (action.trim()) {
                                    onRecord(referralId, action, notes);
                                    onClose();
                                }
                            }}
                            disabled={!action.trim()}
                            className="flex-1 rounded-2xl bg-success py-3 text-sm font-bold text-success-foreground shadow-sm transition-colors hover:bg-success/90 disabled:opacity-50"
                        >
                            حفظ الإجراء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
