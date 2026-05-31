"use client";

import React, { useState } from "react";
import { StudentOption } from "@/lib/types/classroom";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, X, Star, Trophy, Sparkles } from "lucide-react";

interface RandomPickerProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentOption[];
    onPick: (noRepeat: boolean) => void;
    picking: boolean;
    pickedStudent: StudentOption | null;
    pickerType: "standard" | "train";
    setPickerType: (type: "standard" | "train") => void;
}

export function RandomPicker({
    isOpen,
    onClose,
    students,
    onPick,
    picking,
    pickedStudent,
    pickerType,
    setPickerType
}: RandomPickerProps) {
    const [noRepeat, setNoRepeat] = useState(true);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg glass-panel p-8 rounded-[3rem] border border-white/10 shadow-3xl text-center overflow-hidden"
                    >
                        {/* Background Sparkles */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <Sparkles className="absolute top-10 left-10 w-20 h-20 text-indigo-500 animate-pulse" />
                            <Sparkles className="absolute bottom-10 right-10 w-16 h-16 text-emerald-500 animate-bounce" />
                        </div>

                        <header className="flex justify-between items-center mb-10">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPickerType("standard")}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pickerType === 'standard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                                >
                                    عشوائي كلاسيكي
                                </button>
                                <button
                                    onClick={() => setPickerType("train")}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pickerType === 'train' ? 'bg-[hsl(var(--gold-strong))] text-white shadow-lg shadow-[hsla(var(--gold),.20)]' : 'bg-white/5 text-zinc-500 hover:text-white'}`}
                                >
                                    القطار السريع 🚅
                                </button>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:bg-white/10 hover:text-white transition-all" aria-label="إغلاق القرعة العشوائية">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="min-h-[300px] flex flex-col items-center justify-center gap-8 py-10">
                            {!pickedStudent && !picking ? (
                                <div className="space-y-6">
                                    <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-indigo-500/30">
                                        <Shuffle className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white">ابدأ الاختيار الذكي</h2>
                                    <p className="text-zinc-500 text-sm font-medium">سيقوم النظام باختيار أحد الطلاب عشوائياً للمشاركة</p>
                                </div>
                            ) : pickedStudent && !picking ? (
                                <motion.div
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="relative">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-500/40 border-4 border-white/20 mx-auto"
                                        >
                                            {pickedStudent.name[0]}
                                        </motion.div>
                                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-[hsl(var(--gold))] rounded-full flex items-center justify-center shadow-lg border-4 border-[#09090b]">
                                            <Trophy className="text-white w-6 h-6" />
                                        </div>
                                    </div>
                                    <h1 className="text-3xl font-black text-white tracking-tight">{pickedStudent.name}</h1>
                                    <div className="flex gap-2 justify-center">
                                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20">جاهز للمشاركة</div>
                                        {noRepeat && <div className="px-3 py-1 bg-zinc-800 text-zinc-500 text-[10px] font-black rounded-full border border-white/5">لن يتكرر</div>}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="relative w-full overflow-hidden h-40 flex items-center justify-center">
                                    {pickerType === "standard" ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 0.8, 1.1, 1],
                                                    rotateY: [0, 180, 360],
                                                }}
                                                transition={{ repeat: Infinity, duration: 0.8 }}
                                                className="w-24 h-32 bg-zinc-800 rounded-2xl border-4 border-white/10 flex items-center justify-center"
                                            >
                                                <Star className="text-indigo-400 w-10 h-10 fill-indigo-400/20" />
                                            </motion.div>
                                            <div className="text-xs font-black text-indigo-400 animate-pulse tracking-widest uppercase">جاري السحب...</div>
                                        </div>
                                    ) : (
                                        <div className="w-full relative flex items-center">
                                            <motion.div
                                                animate={{ x: [-500, 500] }}
                                                transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
                                                className="flex gap-4"
                                            >
                                                {students.concat(students).map((s, i) => (
                                                    <div key={i} className="w-20 h-20 bg-zinc-800 rounded-2xl border border-white/5 flex items-center justify-center text-zinc-500 font-bold shrink-0">
                                                        {s.name[0]}
                                                    </div>
                                                ))}
                                            </motion.div>
                                            <div className="absolute inset-0 border-x-8 border-indigo-600/50 z-10 pointer-events-none" />
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-full bg-indigo-500 z-20" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={noRepeat}
                                        onChange={(e) => setNoRepeat(e.target.checked)}
                                        id="norepeat"
                                        className="w-4 h-4 rounded-md border-white/10 bg-zinc-900 accent-indigo-500"
                                    />
                                    <label htmlFor="norepeat" className="text-xs font-bold text-zinc-500">عدم تكرار الطلاب المختارين</label>
                                </div>

                                <button
                                    onClick={() => onPick(noRepeat)}
                                    disabled={picking}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {picking ? (
                                        <>جاري الاختيار...</>
                                    ) : (
                                        <>
                                            <Shuffle className="w-6 h-6" /> اختر الطالب
                                        </>
                                    )}
                                </button>
                            </div>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
