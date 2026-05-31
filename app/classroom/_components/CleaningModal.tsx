"use client";

import React, { useState } from "react";
import { AlertTriangle, Star } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSend: (rating: number, comment: string) => void;
}

export function CleaningModal({ isOpen, onClose, onSend }: Props) {
    const [rating, setRating] = useState(1);
    const [comment, setComment] = useState("");

    const handleSubmit = () => {
        onSend(rating, comment);
        setRating(1);
        setComment("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">بلاغ نظافة الفصل</h2>
                        <p className="text-xs text-zinc-500">سيصل البلاغ للمدير ومسؤول النظافة فوراً</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-3 text-right">تقييم مستوى النظافة الحالي:</label>
                        <div className="flex flex-row-reverse justify-center gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${rating >= star ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                        }`}
                                    aria-label={`تقييم ${star} من 5`}
                                >
                                    <Star className={`w-5 h-5 ${rating >= star ? "fill-current" : ""}`} />
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-xs mt-2 text-zinc-500">
                            {rating === 1 ? "سيئ جداً" : rating === 5 ? "ممتاز" : "متوسط"}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2 text-right">ملاحظات إضافية:</label>
                        <textarea
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-200 focus:border-orange-500/50 outline-none transition-all h-24 resize-none"
                            placeholder="اكتب ملاحظاتك هنا..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 bg-zinc-950/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-800 transition-all"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-2 px-8 py-3 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-500 shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                    >
                        إرسال البلاغ 🚨
                    </button>
                </div>
            </div>
        </div>
    );
}
