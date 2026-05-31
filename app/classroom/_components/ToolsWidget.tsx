"use client";

import React, { useState, useEffect, startTransition } from "react";
import { Timer, Signal, Shuffle, Play, Pause, RotateCcw, X, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ToolsWidgetProps {
    onOpenPicker: () => void;
}

export function ToolsWidget({ onOpenPicker }: ToolsWidgetProps) {
    const [activeTool, setActiveTool] = useState<"timer" | "traffic" | null>(null);

    // Timer State
    const [timeLeft, setTimeLeft] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerInput, setTimerInput] = useState("5");

    // Traffic Light State
    const [light, setLight] = useState<"red" | "yellow" | "green">("green");

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            startTransition(() => setIsTimerRunning(false));
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timeLeft]);

    const startTimer = () => {
        setTimeLeft(parseInt(timerInput) * 60);
        setIsTimerRunning(true);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed bottom-24 right-8 z-[100] flex flex-col items-end gap-4">
            {/* Tool Panels */}
            <AnimatePresence>
                {activeTool === "timer" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl w-64"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">مؤقت زمني</h4>
                            <button onClick={() => setActiveTool(null)} className="text-zinc-500 hover:text-white" aria-label="إغلاق المؤقت"><X size={14} /></button>
                        </div>

                        <div className="text-4xl font-black text-center mb-6 text-white tracking-widest">
                            {formatTime(timeLeft)}
                        </div>

                        {!isTimerRunning && timeLeft === 0 ? (
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={timerInput}
                                    onChange={(e) => setTimerInput(e.target.value)}
                                    className="bg-zinc-800 border border-white/5 rounded-xl px-3 py-2 text-xs w-full text-white outline-none focus:border-indigo-500"
                                    placeholder="دقيقة"
                                />
                                <button
                                    onClick={startTimer}
                                    className="bg-indigo-600 p-2 rounded-xl text-white hover:bg-indigo-500"
                                    aria-label="تشغيل المؤقت"
                                >
                                    <Play size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    className="flex-1 bg-zinc-800 p-2 rounded-xl text-white hover:bg-zinc-700 flex justify-center"
                                    aria-label={isTimerRunning ? "إيقاف مؤقت" : "استئناف"}
                                >
                                    {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                                </button>
                                <button
                                    onClick={() => { setTimeLeft(0); setIsTimerRunning(false); }}
                                    className="bg-zinc-800 p-2 rounded-xl text-white hover:bg-zinc-700"
                                    aria-label="إعادة تعيين"
                                >
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTool === "traffic" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="glass-panel p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-3"
                    >
                        <button
                            onClick={() => setLight("red")}
                            className={`w-10 h-10 rounded-full border-4 transition-all ${light === 'red' ? 'bg-rose-500 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'bg-zinc-900 border-white/5 opacity-30 hover:opacity-100'}`}
                            aria-label="ضوء أحمر"
                        />
                        <button
                            onClick={() => setLight("yellow")}
                            className={`w-10 h-10 rounded-full border-4 transition-all ${light === 'yellow' ? 'bg-[hsl(var(--gold))] border-[hsla(var(--gold),.45)] shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-zinc-900 border-white/5 opacity-30 hover:opacity-100'}`}
                            aria-label="ضوء أصفر"
                        />
                        <button
                            onClick={() => setLight("green")}
                            className={`w-10 h-10 rounded-full border-4 transition-all ${light === 'green' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-zinc-900 border-white/5 opacity-30 hover:opacity-100'}`}
                            aria-label="ضوء أخضر"
                        />
                        <button onClick={() => setActiveTool(null)} className="mt-2 text-zinc-500 hover:text-white flex justify-center" aria-label="إغلاق الإشارة"><X size={14} /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Toggle Button */}
            <div className="flex gap-2 bg-zinc-950/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl">
                <button
                    onClick={() => setActiveTool(activeTool === "timer" ? null : "timer")}
                    className={`p-3 rounded-xl transition-all ${activeTool === "timer" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                    aria-label="المؤقت"
                >
                    <Timer size={20} />
                </button>
                <button
                    onClick={() => setActiveTool(activeTool === "traffic" ? null : "traffic")}
                    className={`p-3 rounded-xl transition-all ${activeTool === "traffic" ? "bg-[hsl(var(--gold-strong))] text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                    aria-label="الإشارة الضوئية"
                >
                    <Signal size={20} />
                </button>
                <button
                    onClick={onOpenPicker}
                    className="p-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                    aria-label="القرعة العشوائية"
                >
                    <Shuffle size={20} />
                </button>
                <div className="w-[1px] h-10 bg-white/5 mx-1" />
                <div className="p-3 text-zinc-600 cursor-grab active:cursor-grabbing">
                    <GripVertical size={20} />
                </div>
            </div>
        </div>
    );
}
