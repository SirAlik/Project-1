"use client";

import React, { useState } from "react";
import { StudentOption } from "@/lib/types/classroom";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, X, Lock, Unlock, LayoutGrid, Users2 } from "lucide-react";

interface GroupToolProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentOption[];
    onDistribute: (count: number, bySize: boolean) => string[][];
}

export function GroupTool({ isOpen, onClose, students, onDistribute }: GroupToolProps) {
    const [groupCount, setGroupCount] = useState(4);
    const [distType, setDistType] = useState<"count" | "size">("count");
    const [groups, setGroups] = useState<{ id: number; studentIds: string[] }[]>([]);
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    const handleGenerate = () => {
        const generated = onDistribute(groupCount, distType === "size");
        setGroups(generated.map((ids, i) => ({ id: i + 1, studentIds: ids })));
    };

    const togglePin = (studentId: string) => {
        setPinnedIds(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-white/95 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-5xl glass-panel p-8 rounded-[2.5rem] border border-stone-200 shadow-3xl flex flex-col max-h-[90vh]"
                    >
                        <header className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                                    <Users2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground">توزيع المجموعات الذكي</h2>
                                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">تقسيم الفصل إلى فرق عمل</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-stone-500 hover:text-foreground transition-all" aria-label="إغلاق أداة المجموعات">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                            {/* Controls */}
                            <aside className="w-full lg:w-72 space-y-8">
                                <section className="space-y-4">
                                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">نوع التوزيع</label>
                                    <div className="flex bg-white/80 p-1 rounded-2xl border border-stone-200">
                                        <button
                                            onClick={() => setDistType("count")}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${distType === 'count' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
                                        >
                                            عدد المجموعات
                                        </button>
                                        <button
                                            onClick={() => setDistType("size")}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${distType === 'size' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
                                        >
                                            عدد الطلاب
                                        </button>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                                        {distType === 'count' ? "عدد المجموعات المطلوبة" : "عدد الطلاب في كل مجموعة"}
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="2"
                                            max="10"
                                            value={groupCount}
                                            onChange={(e) => setGroupCount(parseInt(e.target.value))}
                                            className="flex-1 accent-indigo-500"
                                            aria-label="عدد المجموعات أو الطلاب"
                                        />
                                        <span className="text-xl font-black text-foreground w-8">{groupCount}</span>
                                    </div>
                                </section>

                                <button
                                    onClick={handleGenerate}
                                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all transition-transform active:scale-95 shadow-xl shadow-white/5"
                                >
                                    <Shuffle size={18} /> بدء التوزيع
                                </button>

                                <div className="p-4 rounded-2xl bg-[hsla(var(--accent-primary),.05)] border border-[hsla(var(--accent-primary),.10)]">
                                    <p className="text-[10px] text-[hsla(var(--accent-primary),.60)] font-medium leading-relaxed">
                                        <Lock size={12} className="inline mr-1" /> يمكنك تثبيت طلاب معينين في مجموعاتهم الحالية قبل إعادة التوزيع.
                                    </p>
                                </div>
                            </aside>

                            {/* Groups Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-8 h-full">
                                {groups.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-stone-500 gap-4 opacity-50">
                                        <LayoutGrid size={64} strokeWidth={1} />
                                        <p className="text-sm font-bold">لم يتم توزيع المجموعات بعد</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groups.map((group) => (
                                            <div key={group.id} className="glass-panel p-5 rounded-3xl border border-stone-200 bg-white/80">
                                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-stone-200">
                                                    <h3 className="text-xs font-black text-foreground flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">{group.id}</span>
                                                        المجموعة {group.id}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-stone-500">{group.studentIds.length} طلاب</span>
                                                </div>

                                                <div className="space-y-2">
                                                    {group.studentIds.map(sid => {
                                                        const student = students.find(s => s.id === sid);
                                                        const isPinned = pinnedIds.includes(sid);
                                                        return (
                                                            <div key={sid} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-stone-200 hover:border-stone-200 transition-all group/item">
                                                                <span className="text-xs font-bold text-stone-600">{student?.name}</span>
                                                                <button
                                                                    onClick={() => togglePin(sid)}
                                                                    className={`p-1.5 rounded-lg transition-all ${isPinned ? 'text-[hsl(var(--accent-primary))] bg-[hsla(var(--accent-primary),.10)]' : 'text-stone-500 hover:text-foreground opacity-0 group-hover/item:opacity-100'}`}
                                                                >
                                                                    {isPinned ? <Lock size={12} /> : <Unlock size={12} />}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
