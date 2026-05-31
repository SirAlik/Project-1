"use client";

import React, { useEffect, useState, useRef } from "react";
import { LucideIcon } from "lucide-react";

interface Props {
    title: string;
    value: number;
    label?: string;
    suffix?: string;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    icon: LucideIcon;
    color?: "primary" | "accent";
    delay?: number;
}

export function KPIStatCard({ title, value, suffix = "", trend, icon: Icon, color = "primary", delay = 0 }: Props) {
    const [displayValue, setDisplayValue] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const duration = 1500;
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);
        const increment = value / totalFrames;

        let currentFrame = 0;
        const timer = setInterval(() => {
            currentFrame++;
            setDisplayValue(Math.min(increment * currentFrame, value));
            if (currentFrame === totalFrames) clearInterval(timer);
        }, frameDuration);

        return () => clearInterval(timer);
    }, [isVisible, value]);

    const colorMap = {
        primary: "text-[var(--primary)] border-[var(--primary)]/10 bg-[var(--primary)]/5",
        accent: "text-[var(--accent)] border-[var(--accent)]/10 bg-[var(--accent)]/5",
    };

    return (
        <div
            ref={cardRef}
            className={`glass-panel p-8 rounded-[2.5rem] border group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden flex flex-col items-center text-center ${isVisible ? 'animate-in fade-in slide-in-from-bottom-8' : 'opacity-0'}`}
            {...(delay > 0 && { 'data-delay': delay })}
        >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${colorMap[color as keyof typeof colorMap]}`}>
                <Icon className="w-8 h-8 icon-morph" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{title}</p>

            <div className="flex items-baseline gap-1 mb-2">
                <h3 className="text-4xl md:text-5xl font-black tracking-tight tabular-nums">
                    {Math.floor(displayValue).toLocaleString('en-US')}
                </h3>
                {suffix && <span className="text-xl font-bold opacity-60">{suffix}</span>}
            </div>

            {trend && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border transition-all ${trend.isPositive ? 'border-[var(--primary)]/20 text-[var(--primary)]' : 'border-[var(--danger)]/20 text-[var(--danger)]'}`}>
                    {trend.isPositive ? "▲" : "▼"} {trend.value}
                </div>
            )}

            {/* Hover Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            {/* Background Accent Glow */}
            <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-1000 ${colorMap[color]}`} />
        </div>
    );
}
