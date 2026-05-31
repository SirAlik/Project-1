"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface Props {
    title: string;
    metric: string;
    description: string;
    icon: LucideIcon;
    color?: "primary" | "accent";
    delay?: number;
}

export function HighlightTile({ title, metric, description, icon: Icon, color = "primary", delay = 0 }: Props) {
    const colorMap = {
        primary: "text-[var(--primary)] border-[var(--primary)]/10 bg-[var(--primary)]/5",
        accent: "text-[var(--accent)] border-[var(--accent)]/10 bg-[var(--accent)]/5",
    };

    return (
        <div
            className="glass-panel p-8 rounded-[2.5rem] border group hover:border-[var(--primary)]/30 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${colorMap[color as keyof typeof colorMap]}`}>
                    <Icon className="w-6 h-6 icon-morph" />
                </div>
                <div className={`text-xl font-black tracking-tighter ${colorMap[color as keyof typeof colorMap].split(' ')[0]}`}>
                    {metric}
                </div>
            </div>

            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-sm opacity-40 leading-relaxed font-medium">
                {description}
            </p>

            <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 text-[var(--accent)]">Learn More</span>
            </div>
        </div>
    );
}
