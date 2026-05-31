"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Zap, Heart, Star, Target, ShieldCheck } from "lucide-react";

interface BadgesModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    studentId: string;
    onAward: (studentId: string, badgeType: string) => Promise<void>;
}

const BADGE_TYPES = [
    { id: 'creative', label: 'المفكر المبدع', icon: Zap, color: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' },
    { id: 'leader', label: 'القائد الصغير', icon: ShieldCheck, color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' },
    { id: 'collaborative', label: 'المتعاون المثالي', icon: Heart, color: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20' },
    { id: 'disciplined', label: 'المنضبط دائماً', icon: CheckCircle, color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' },
    { id: 'persistent', label: 'المثابر المجتهد', icon: Target, color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20' },
    { id: 'star_week', label: 'نجم الأسبوع', icon: Star, color: 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/40 shadow-[0_0_15px_rgba(62,199,211,0.2)]' }
];

// Helper to avoid React icons mismatch
import { CheckCircle } from "lucide-react";

export function BadgesModal({ isOpen, onClose, studentName, studentId, onAward }: BadgesModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                        dir="rtl"
                    >
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] shadow-lg shadow-[var(--primary)]/20">
                                        <Award className="w-6 h-6 icon-morph" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">تقليد الأوسمة الاستحقاقية</h3>
                                        <p className="text-xs text-zinc-500 font-bold">تكريم الطالب: {studentName}</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 transition-colors" aria-label="إغلاق النافذة">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                                {BADGE_TYPES.map((badge) => (
                                    <motion.button
                                        key={badge.id}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            onAward(studentId, badge.label);
                                            onClose();
                                        }}
                                        className={`flex flex-col items-center gap-3 p-6 rounded-[24px] border-2 transition-all ${badge.color} border-transparent hover:border-current group`}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                            <badge.icon size={32} />
                                        </div>
                                        <span className="text-xs font-black text-center">{badge.label}</span>
                                    </motion.button>
                                ))}
                            </div>

                            <p className="text-[10px] text-center text-zinc-600 font-bold mt-4 uppercase tracking-[0.2em]">سيتم إضافة 5 نقاط تلقائية لرصيد الطالب عند منحه أي وسام</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
