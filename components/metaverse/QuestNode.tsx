'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Play } from 'lucide-react';

export interface QuestNodeProps {
    id: string;
    title: string;
    status: 'locked' | 'available' | 'completed';
    type: 'academic' | 'behavior' | 'social';
    position: 'left' | 'center' | 'right';
    onClick?: (id: string) => void;
}

export const QuestNode = ({ id, title, status, type, position, onClick }: QuestNodeProps) => {
    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';

    const typeColor = type === 'academic' ? 'primary' : type === 'behavior' ? 'accent' : 'warning';

    const positionClass = position === 'left' ? '-translate-x-12' : position === 'right' ? 'translate-x-12' : '';

    return (
        <div className={`relative flex flex-col items-center ${positionClass}`}>
            <motion.button
                whileHover={!isLocked ? { scale: 1.1 } : {}}
                whileTap={!isLocked ? { scale: 0.95 } : {}}
                onClick={() => !isLocked && onClick?.(id)}
                className={`w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg ${isLocked
                        ? 'bg-surface-2 border-white/5 text-muted grayscale'
                        : isCompleted
                            ? `bg-${typeColor}/20 border-${typeColor} text-${typeColor} shadow-${typeColor}/20`
                            : `bg-surface border-${typeColor}/50 text-${typeColor} ring-4 ring-${typeColor}/10 animate-pulse`
                    }`}
            >
                {isLocked ? <Lock size={24} /> : isCompleted ? <Check size={24} strokeWidth={3} /> : <Play size={24} className="fill-current" />}
            </motion.button>

            <div className="mt-2 text-center max-w-[80px]">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isLocked ? 'text-muted' : 'text-text'}`}>
                    {title}
                </span>
            </div>

            {/* Connection Line (Visual Only for now) */}
            <div className="absolute top-full h-12 w-0.5 bg-white/5 -z-10" />
        </div>
    );
};
