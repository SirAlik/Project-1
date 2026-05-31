"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { X, Calendar, Clock, BookOpen, Users } from "lucide-react";

interface LRCBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBook: (data: { period: number; subject: string; classId: string; date: string }) => void;
    classes: { id: string; name: string }[];
}

export function LRCBookingModal({ isOpen, onClose, onBook, classes }: LRCBookingModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [period, setPeriod] = useState(1);
    const [subject, setSubject] = useState("");
    const [classId, setClassId] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <Card className="w-full max-w-md border-violet-500/30 bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-violet-600/10 to-transparent">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-violet-400" />
                        حجز مركز مصادر التعلم
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="إغلاق النافذة">
                        <X size={20} className="text-zinc-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4" dir="rtl">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> التاريخ
                        </label>
                        <input
                            type="date"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            aria-label="تاريخ الحجز"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> الحصة
                            </label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                                value={period}
                                onChange={(e) => setPeriod(parseInt(e.target.value))}
                                aria-label="الحصة"
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>الحصة {n}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> الفصل
                            </label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                aria-label="الفصل"
                            >
                                <option value="">اختر الفصل...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> المادة / المقرر
                        </label>
                        <input
                            type="text"
                            placeholder="مثال: لغتي الجميلة - الوحدة الثالثة"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            aria-label="المادة / المقرر"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={() => onBook({ date, period, subject, classId })}
                            disabled={!classId || !subject}
                            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20"
                        >
                            إرسال طلب الحجز
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-zinc-950/50 text-[10px] text-zinc-500 text-center">
                    سيصل طلبك لأمين مصادر التعلم للمراجعة والاعتماد.
                </div>
            </Card>
        </div>
    );
}
