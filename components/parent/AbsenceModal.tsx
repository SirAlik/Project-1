"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { X, Calendar, Send } from "lucide-react";

interface AbsenceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AbsenceModal({ isOpen, onClose }: AbsenceModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-card border-border p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 p-2 hover:bg-muted/10 rounded-full transition-colors"
                    aria-label="إغلاق النافذة"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <header className="mb-8">
                    <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                        <Calendar className="text-primary w-6 h-6" />
                        تقديم بلاغ غياب
                    </h2>
                    <p className="text-muted-foreground text-sm mt-2">يرجى تحديد نوع الغياب وتاريخه لإرساله للوكيل.</p>
                </header>

                <form className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">تاريخ الغياب</label>
                        <input
                            type="date"
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                            aria-label="تاريخ الغياب"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">نوع الغياب</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" className="p-4 border border-border bg-muted/50 rounded-xl text-sm font-bold hover:border-primary hover:bg-primary/5 transition-all" aria-label="نوع الغياب: بعذر طبي">
                                بعذر طبي
                            </button>
                            <button type="button" className="p-4 border border-border bg-muted/50 rounded-xl text-sm font-bold hover:border-primary hover:bg-primary/5 transition-all" aria-label="نوع الغياب: بدون عذر">
                                بدون عذر
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">السبب / ملاحظات إضافية</label>
                        <textarea
                            rows={4}
                            placeholder="اكتب سبب الغياب هنا..."
                            className="w-full bg-muted/50 border border-border rounded-xl p-3 text-sm focus:border-primary outline-none h-32 resize-none"
                            aria-label="سبب الغياب"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" /> إرسال الطلب
                    </button>
                </form>
            </Card>
        </div>
    );
}
