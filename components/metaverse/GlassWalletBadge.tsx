'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Zap } from 'lucide-react';

interface GlassWalletBadgeProps {
    xp: number;
    coins: number;
}

export const GlassWalletBadge = ({ xp, coins }: GlassWalletBadgeProps) => {
    return (
        <div className="flex items-center gap-3">
            {/* XP Badge */}
            <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="holo-panel px-4 py-2 flex items-center gap-3 border-primary/20 bg-primary/5 min-w-[100px]"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/40 blur-lg rounded-full animate-pulse" />
                    <div className="relative bg-primary/20 p-1.5 rounded-xl border border-primary/30">
                        <Zap size={16} className="text-primary fill-primary/60" strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-primary/80 font-black uppercase tracking-[0.2em] leading-none mb-1">XP Points</span>
                    <span className="text-base font-bold tabular-nums text-text leading-none tracking-tight">
                        {xp.toLocaleString('en-US')}
                    </span>
                </div>
            </motion.div>

            {/* Coins Badge */}
            <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="holo-panel px-4 py-2 flex items-center gap-3 border-accent/20 bg-accent/5 min-w-[100px]"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-accent/40 blur-lg rounded-full animate-pulse" />
                    <div className="relative bg-accent/20 p-1.5 rounded-xl border border-accent/30">
                        <Coins size={16} className="text-accent fill-accent/60" strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-accent/80 font-black uppercase tracking-[0.2em] leading-none mb-1">Cyber Coins</span>
                    <span className="text-base font-bold tabular-nums text-text leading-none tracking-tight">
                        {coins.toLocaleString('en-US')}
                    </span>
                </div>
            </motion.div>
        </div>
    );
};
