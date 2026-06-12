'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlitchOverlayProps {
    level: number; // 1-5
}

export const GlitchOverlay = ({ level }: GlitchOverlayProps) => {
    if (level <= 0) return null;

    // Intensity increases with level
    const opacity = 0.05 + (level * 0.05);

    return (
        <div className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden">
            {/* Chromatic Aberration Layer */}
            <motion.div
                animate={{
                    x: [-2, 2, -1, 3, 0],
                    y: [1, -1, 2, -2, 0],
                    filter: [
                        `drop-shadow(2px 0 blue) drop-shadow(-2px 0 red)`,
                        `drop-shadow(-3px 0 blue) drop-shadow(3px 0 red)`,
                        `drop-shadow(2px 0 blue) drop-shadow(-2px 0 red)`,
                    ]
                }}
                transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                }}
                style={{ opacity }}
                className="absolute inset-0 bg-transparent"
            />

            {/* Static Noise Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />

            {/* Horizontal Scanline Glitch */}
            <motion.div
                animate={{
                    top: ['-10%', '110%'],
                    opacity: [0, 0.5, 0]
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear'
                }}
                className="absolute left-0 right-0 h-2 bg-primary/20 blur-sm shadow-[0_0_20px_var(--primary)]"
            />

            {/* Corruption Text Indicator (Rare Spawn) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.1, repeat: 5, repeatDelay: 10 }}
                className="absolute top-1/4 left-1/2 -translate-x-1/2 text-primary font-black text-4xl opacity-10 tracking-[1em]"
            >
                SYSTEM CORRUPTED
            </motion.div>
        </div>
    );
};
