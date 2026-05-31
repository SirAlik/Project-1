"use client";

import React, { useEffect, useState } from "react";
import { Activity, Clock, MapPin, Zap } from "lucide-react";

const UPDATES = [
    { id: 1, label: "حالة المكتبة", value: "نشطة حالياً", icon: Activity, color: "text-success" },
    { id: 2, label: "الصالة الرياضية", value: "مباراة كرة سلة", icon: MapPin, color: "text-primary" },
    { id: 3, label: "الحدث القادم", value: "معرض العلوم (بعد يومين)", icon: Zap, color: "text-warning" },
    { id: 4, label: "المختبرات", value: "تجارب الكيمياء الحيوية", icon: Clock, color: "text-info" },
];

export function LivePulse() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % UPDATES.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const current = UPDATES[index];

    return (
        <div className="relative overflow-hidden h-14 glass-panel border border-white/5 rounded-2xl flex items-center px-6 group opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4 w-full">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-destructive shadow-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Live School Pulse</span>
                </div>

                <div className="h-4 w-[1px] bg-white/10 mx-2" />

                <div
                    key={index}
                    className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-700"
                >
                    <div className={`${current.color} p-1.5 rounded-lg bg-white/5`}>
                        <current.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                        <span className="text-[10px] font-black opacity-30">{current.label}:</span>
                        <span className="text-[11px] font-bold tracking-tight">{current.value}</span>
                    </div>
                </div>
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--surface)] to-transparent pointer-events-none" />
        </div>
    );
}
