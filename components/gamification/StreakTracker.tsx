'use client';

import React from 'react';
import { Flame } from 'lucide-react';

interface StreakTrackerProps {
    count: number;
    history: boolean[]; // last 7 days
}

export const StreakTracker = ({ count, history }: StreakTrackerProps) => {
    const days = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

    return (
        <div className="glass-panel p-5 rounded-3xl border-orange-500/20 bg-orange-500/5 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                        <Flame className="text-orange-500 fill-orange-500/40" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tabular-nums">{count.toLocaleString('en-US')} يوم</h3>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider">سلسلة الالتزام</p>
                    </div>
                </div>

                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <span className="text-[10px] font-bold text-orange-500 tracking-tighter">+10% XP Boost</span>
                </div>
            </div>

            <div className="flex justify-between gap-1.5 relative z-10">
                {days.map((day, i) => (
                    <div key={day} className="flex flex-col items-center gap-2">
                        <div
                            className={`w-7 h-9 rounded-xl border flex items-center justify-center transition-all duration-500 ${history[i]
                                    ? 'bg-orange-500 border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.4)] text-white'
                                    : 'bg-white/5 border-white/5 text-muted'
                                }`}
                        >
                            {history[i] ? <Flame size={12} className="fill-white" /> : <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />}
                        </div>
                        <span className="text-[7px] font-bold text-muted uppercase tracking-tighter">{day}</span>
                    </div>
                ))}
            </div>

            <Flame size={100} className="absolute -right-8 -bottom-8 text-orange-500/5 rotate-12" />
        </div>
    );
};
