"use client";

import React, { useState } from "react";
import { GradebookItem, StudentOption } from "@/lib/types/classroom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Save, X, Edit3, Trash2, Link as LinkIcon, CheckCircle2 } from "lucide-react";

interface GradebookDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: GradebookItem[];
    students: StudentOption[];
    dailyScores: Record<string, number>;
}

export function GradebookDrawer({ isOpen, onClose, items, students, dailyScores }: GradebookDrawerProps) {
    const [view, setView] = useState<"summary" | "settings">("summary");
    const [localItems, setLocalItems] = useState<GradebookItem[]>(items);

    const addItem = () => {
        const newItem: GradebookItem = {
            id: globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}`,
            title: "بند جديد",
            maxPoints: 10
        };
        setLocalItems([...localItems, newItem]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[120] bg-white/95 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        className="fixed inset-y-0 right-0 z-[130] w-full max-w-xl bg-stone-100 border-l border-stone-200 shadow-3xl flex flex-col"
                        dir="rtl"
                    >
                        <header className="p-8 border-b border-stone-200 flex justify-between items-center bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground tracking-tight">دفتر المتابعة الرقمي</h2>
                                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mt-1">إعدادات الدرجات والمشاركة</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone-500 hover:text-foreground transition-all" aria-label="إغلاق دفتر المتابعة">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="flex gap-2 mb-8 bg-white/80 p-1.5 rounded-2xl border border-stone-200">
                                <button
                                    onClick={() => setView("summary")}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${view === 'summary' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-stone-500 hover:text-stone-600'}`}
                                >
                                    ملخص الدرجات
                                </button>
                                <button
                                    onClick={() => setView("settings")}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${view === 'settings' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-stone-500 hover:text-stone-600'}`}
                                >
                                    بنود التقييم
                                </button>
                            </div>

                            {view === "summary" ? (
                                <div className="space-y-4">
                                    {students.map(s => (
                                        <div key={s.id} className="flex items-center justify-between p-4 rounded-3xl bg-white/80 border border-stone-200 hover:border-stone-200 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center text-xs font-black text-stone-500">
                                                    {s.name[0]}
                                                </div>
                                                <span className="text-sm font-bold text-stone-600">{s.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-stone-500 uppercase">مجموع النقاط</p>
                                                    <p className={`text-lg font-black ${dailyScores[s.id] > 0 ? 'text-emerald-500' : dailyScores[s.id] < 0 ? 'text-rose-500' : 'text-stone-500'}`}>
                                                        {dailyScores[s.id] || 0}
                                                    </p>
                                                </div>
                                                <button className="p-2 rounded-lg bg-white/5 text-stone-500 opacity-0 group-hover:opacity-100 transition-all hover:text-foreground" aria-label="تعديل الدرجات">
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest">البنود النشطة</h3>
                                        <button
                                            onClick={addItem}
                                            className="flex items-center gap-2 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            <Plus size={14} /> إضافة بند
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {localItems.map(item => (
                                            <div key={item.id} className="p-5 rounded-3xl bg-white/80 border border-stone-200 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <input
                                                            className="bg-transparent text-sm font-black text-foreground outline-none border-b border-transparent focus:border-indigo-500 transition-all pb-1 w-full"
                                                            value={item.title}
                                                            aria-label="عنوان البند"
                                                            onChange={(e) => {
                                                                const updated = localItems.map(i => i.id === item.id ? { ...i, title: e.target.value } : i);
                                                                setLocalItems(updated);
                                                            }}
                                                        />
                                                        <p className="text-[10px] font-bold text-stone-500">الدرجة العظمى: {item.maxPoints}</p>
                                                    </div>
                                                    <button className="text-zinc-700 hover:text-rose-500 transition-colors" aria-label="حذف البند">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
                                                    <div className={`p-1.5 rounded-lg border transition-all ${item.linkedToEvent ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-stone-100 border-stone-200 text-stone-500'}`}>
                                                        <LinkIcon size={12} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-stone-500">
                                                        {item.linkedToEvent ? `مرتبط بـ: ${item.linkedToEvent}` : "غير مرتبط بإجراء"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-between shadow-xl shadow-indigo-600/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                                <CheckCircle2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black">الربط التلقائي نشط</p>
                                                <p className="text-[9px] font-bold opacity-70 italic">يتم إضافة الدرجات تلقائياً عند المشاركة</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="p-8 border-t border-stone-200 bg-white/80 backdrop-blur-xl">
                            <button
                                onClick={onClose}
                                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95"
                            >
                                <Save size={18} /> حفظ الإعدادات
                            </button>
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
