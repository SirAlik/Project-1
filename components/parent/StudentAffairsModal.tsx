"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { X, ShieldAlert, Send } from "lucide-react";

interface StudentAffairsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StudentAffairsModal({ isOpen, onClose }: StudentAffairsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-card border-border p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-accent/80" />

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-muted/10 rounded-full transition-colors absolute top-4 left-4"
                    aria-label="إغلاق النافذة"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <header className="mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <ShieldAlert className="text-accent w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">تواصل مع وكيل شؤون الطلاب</h2>
                        <p className="text-muted-foreground text-xs mt-1">قسم القضايا الطلابية والضوابط السلوكية</p>
                    </div>
                </header>

                <div className="space-y-6">
                    <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
                        <p>تنبيه: سيتم توجيه هذه الرسالة مباشرة لمكتب الوكيل للمتابعة الرسمية.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">الموضوع / نوع القضية</label>
                        <select
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
                            aria-label="نوع الطلب"
                        >
                            <option>سلوك طلابي</option>
                            <option>تظلم أو شكوى</option>
                            <option>قضية انضباط</option>
                            <option>أخرى</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">تفاصيل الرسالة</label>
                        <textarea
                            rows={4}
                            placeholder="اكتب تفاصيل معاملتك هنا..."
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent transition-colors resize-none"
                        />
                    </div>

                    <button
                        type="button"
                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-black py-4 rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" /> إرسال المعاملة
                    </button>
                </div>
            </Card>
        </div>
    );
}
