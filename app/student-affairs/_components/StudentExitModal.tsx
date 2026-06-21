"use client";
import React from "react";
import { LogOut, X } from "lucide-react";

interface StudentExitModalProps {
    studentName: string;
    studentId: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (guardian: string, relation: string, reason: string) => void;
}

export function StudentExitModal({ studentName, studentId, isOpen, onClose, onConfirm }: StudentExitModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm" dir="rtl">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
                <div className="mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <LogOut className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground">تسجيل خروج طالب</h3>
                            <p className="text-[11px] font-bold text-muted-foreground">{studentName} ({studentId})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="إغلاق النافذة">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    onConfirm(
                        formData.get('guardian') as string,
                        formData.get('relation') as string,
                        formData.get('reason') as string
                    );
                }} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="px-1 text-[11px] font-bold text-muted-foreground">اسم ولي الأمر المُستلم</label>
                        <input
                            name="guardian"
                            required
                            className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="اسم ولي الأمر"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="px-1 text-[11px] font-bold text-muted-foreground">الصلة</label>
                            <input
                                name="relation"
                                required
                                className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder="صلة القرابة"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="px-1 text-[11px] font-bold text-muted-foreground">السبب</label>
                            <input
                                name="reason"
                                required
                                className="w-full rounded-2xl border border-border bg-surface-soft p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                placeholder="سبب الاستئذان"
                            />
                        </div>
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
                            type="submit"
                            className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                        >
                            تأكيد الخروج
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
