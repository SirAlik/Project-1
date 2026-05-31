"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, GraduationCap } from "lucide-react";
import Link from "next/link";

type ClassItem = {
    id: string;
    name: string;
    grade_level: number;
};

interface ClassNavigatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    classes: ClassItem[];
}

export function ClassNavigatorModal({ isOpen, onClose, classes }: ClassNavigatorModalProps) {
    const grades = [6, 5, 4];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/10"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <LayoutGrid className="w-6 h-6 text-indigo-400" />
                                    مستكشف الفصول
                                </h2>
                                <p className="text-zinc-500 text-sm mt-1">اختر الفصل الذي ترغب في تحليل &quot;شخصيته&quot; وأدائه</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors group" aria-label="إغلاق النافذة">
                                <X className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {grades.map(grade => (
                                <div key={grade} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                            <GraduationCap className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <h3 className="font-bold text-zinc-300">الصف {grade === 6 ? 'السادس' : (grade === 5 ? 'الخامس' : 'الرابع')}</h3>
                                        <div className="flex-1 h-px bg-white/5" />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {classes
                                            .filter(c => c.grade_level === grade)
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(cls => (
                                                <Link
                                                    key={cls.id}
                                                    href={`/principal/analytics/classes/${cls.id}`}
                                                    onClick={onClose}
                                                >
                                                    <div className="group relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden">
                                                        <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors" />
                                                        <div className="relative z-10 text-center">
                                                            <span className="text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                                                                {cls.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}

                                        {/* Fallback mock if data is missing for these specific sections */}
                                        {classes.filter(c => c.grade_level === grade).length === 0 && (
                                            [1, 2, 3, 4].map(num => (
                                                <div key={num} className="p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed text-center">
                                                    <span className="text-lg font-black text-zinc-500">{grade}/{num}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-zinc-950/50 border-t border-white/5 text-center">
                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Antigravity Design System • Class Cockpit v2.0</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
