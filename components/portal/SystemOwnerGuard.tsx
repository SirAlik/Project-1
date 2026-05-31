"use client";

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";

interface SystemOwnerGuardProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function SystemOwnerGuard({ isOpen, onConfirm, onCancel }: SystemOwnerGuardProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-rose-500/30 w-full max-w-md rounded-3xl p-8 shadow-2xl shadow-rose-900/20"
                dir="rtl"
            >
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-6">
                    <ShieldAlert size={32} />
                </div>

                <h3 className="text-2xl font-black text-center mb-2 text-white">
                    تفعيل صلاحيات مالك النظام
                </h3>

                <p className="text-center text-rose-400 font-bold text-sm mb-6">
                    أنت على وشك استخدام صلاحيات{" "}
                    <span className="text-white">&quot;مالك النظام&quot;</span>. جميع الإجراءات الحسّاسة
                    تُسجّل في سجل التدقيق الأمني.
                </p>

                <div className="bg-black/40 rounded-xl p-4 mb-8 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={16} className="text-yellow-500" />
                        <span className="text-xs font-bold text-white">تنبيه أمني</span>
                    </div>
                    <p className="text-[10px] text-zinc-300 leading-relaxed">
                        الرجاء التأكد قبل تنفيذ أي تغيير على الهيكل الأساسي للنظام أو صلاحيات المستخدمين.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl font-bold text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                    >
                        إلغاء
                    </button>

                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2"
                    >
                        تأكيد التفعيل
                        <ArrowRight size={16} className="rotate-180" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}