"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { X, Send, User } from "lucide-react";

interface CounselorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CounselorModal({ isOpen, onClose }: CounselorModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-card border-border p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

                <button
                    onClick={onClose}
                    className="p-2 hover:bg-muted/10 rounded-full transition-colors absolute top-4 left-4"
                    aria-label="إغلاق النافذة"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                <header className="mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <User className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground">تواصل مع الموجه الطلابي</h2>
                        <p className="text-muted-foreground text-xs mt-1">أ. محمد الشمري - الموجه الطلابي</p>
                    </div>
                </header>

                <div className="space-y-6">
                    <div className="bg-muted/30 border border-border rounded-xl p-4 text-xs text-muted-foreground">
                        <p>ملاحظة: الموجه الطلابي سيعيد توجيه طلبك لوكيل شؤون الطلاب إذا كانت المعاملة تتطلب إجراءً إدارياً.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground mr-1">نص الرسالة</label>
                        <textarea
                            rows={5}
                            placeholder="اكتب رسالتك للموجه هنا..."
                            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                        />
                    </div>

                    <button
                        type="button"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        <Send className="w-4 h-4" /> إرسال الرسالة
                    </button>
                </div>
            </Card>
        </div>
    );
}
