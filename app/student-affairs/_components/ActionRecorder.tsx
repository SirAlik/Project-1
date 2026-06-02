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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/95 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-stone-100 border border-stone-200 rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 text-white rounded-3xl">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-foreground">تسجيل إجراء إرشادي</h3>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{studentName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-500 hover:text-foreground transition-colors" aria-label="إغلاق النافذة">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase px-2">الإجراء المتخذ (Action Taken)</label>
                        <textarea
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            required
                            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[100px]"
                            placeholder="Describe the intervention..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-500 uppercase px-2">ملاحظات إضافية (Optional Notes)</label>
                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Extra details..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-stone-200 text-stone-700 py-4 rounded-2xl font-bold text-sm hover:bg-stone-300 transition-all"
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
                            className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            حفظ الإجراء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
