"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
    title: string;
    children: React.ReactNode;
    className?: string;
    subtitle?: string;
}

export function AnalyticsCard({ title, children, className = "", subtitle }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative group ${className}`}
        >
            {/* Glowing Border effect - kept as brand accent */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 via-teal-500/20 to-blue-500/20 rounded-[2rem] blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative bg-card/50 backdrop-blur-xl border border-border rounded-[2rem] p-6 h-full overflow-hidden shadow-sm">
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-6">
                        <h3 className="text-card-foreground font-bold tracking-tight text-lg">{title}</h3>
                        {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
                    </div>
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
