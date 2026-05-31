'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';

interface LootChestProps {
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    onOpen?: () => void;
}

export const LootChest = ({ rarity, onOpen }: LootChestProps) => {
    const [isOpening, setIsOpening] = useState(false);
    const [isOpened, setIsOpened] = useState(false);

    const colors = {
        common: 'text-muted border-muted/20 bg-muted/5',
        rare: 'text-primary border-primary/20 bg-primary/5',
        epic: 'text-accent border-accent/20 bg-accent/5',
        legendary: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
    };

    const handleOpen = () => {
        if (isOpened || isOpening) return;
        setIsOpening(true);
        setTimeout(() => {
            setIsOpening(false);
            setIsOpened(true);
            onOpen?.();
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <motion.div
                animate={isOpening ? {
                    rotate: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.1, 1],
                    y: [0, -10, 0]
                } : { y: [0, -5, 0] }}
                transition={isOpening ? { duration: 0.5, repeat: 3 } : { duration: 2, repeat: Infinity }}
                onClick={handleOpen}
                className={`w-32 h-32 rounded-3xl border-2 flex items-center justify-center cursor-pointer relative group ${colors[rarity]}`}
            >
                {/* Glow Effects */}
                <div className={`absolute inset-0 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full ${colors[rarity].split(' ')[2]}`} />

                <AnimatePresence mode="wait">
                    {!isOpened ? (
                        <motion.div
                            key="closed"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                        >
                            <Gift size={64} className={isOpening ? 'animate-pulse' : ''} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="opened"
                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            className="flex flex-col items-center"
                        >
                            <Sparkles size={64} className="text-yellow-400" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/20 blur-3xl rounded-full" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <div className="text-center">
                <h3 className="font-bold text-sm uppercase tracking-widest">{isOpened ? 'تم الفتح!' : `صندوق ${rarity}`}</h3>
                <p className="text-[10px] text-muted">{isOpened ? 'انظر إلى جردك' : 'انقر للفتح'}</p>
            </div>
        </div>
    );
};
