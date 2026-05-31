'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DormRoom, FurnitureItem } from '@/components/metaverse/DormRoom';
import { Edit3, Check, MousePointer2, Plus, Heart, Share2 } from 'lucide-react';
import { Armchair, Monitor, Lamp, Tv } from 'lucide-react';

const INITIAL_FURNITURE: FurnitureItem[] = [
    { id: 'f1', type: 'chair', x: 2, y: 3, icon: Armchair },
    { id: 'f2', type: 'desk', x: 2, y: 2, icon: Monitor },
    { id: 'f3', type: 'lamp', x: 5, y: 5, icon: Lamp },
];

export default function DormPage() {
    const [furniture, setFurniture] = useState<FurnitureItem[]>(INITIAL_FURNITURE);
    const [isEditMode, setIsEditMode] = useState(false);
    const [likes, setLikes] = useState(124);

    return (
        <div className="space-y-6 pt-4">
            {/* Dorm Header */}
            <div className="flex items-center justify-between px-2">
                <h1 className="text-2xl font-black font-heading tracking-tight">السكن السيبراني</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`p-2 glass-panel rounded-full transition-all ${isEditMode ? 'bg-primary/20 text-primary shadow-[0_0_10px_var(--primary)]' : 'text-muted hover:text-text'
                            }`}
                    >
                        {isEditMode ? <Check size={20} /> : <Edit3 size={20} />}
                    </button>
                </div>
            </div>

            {/* Social Stats */}
            {!isEditMode && (
                <div className="flex items-center gap-4 px-2">
                    <button onClick={() => setLikes(l => l + 1)} className="flex items-center gap-2 group">
                        <div className="p-2 transition-colors rounded-full glass-panel group-hover:text-red-500">
                            <Heart size={16} className={likes > 124 ? 'fill-red-500 text-red-500' : ''} />
                        </div>
                        <span className="text-xs font-bold tabular-nums">{likes} إعجاب</span>
                    </button>
                    <button className="flex items-center gap-2 group">
                        <div className="p-2 transition-colors rounded-full glass-panel group-hover:text-primary">
                            <Share2 size={16} />
                        </div>
                        <span className="text-xs font-bold">مشاركة</span>
                    </button>
                </div>
            )}

            {/* The Room */}
            <div className="py-4">
                <DormRoom furniture={furniture} />
            </div>

            {/* Building UI (Edit Mode Only) */}
            <AnimatePresence>
                {isEditMode && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-24 left-4 right-4 z-40"
                    >
                        <div className="max-w-md mx-auto glass-panel p-4 rounded-3xl border-primary/20 bg-primary/5 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">المعمار الرقمي</h3>
                                <div className="flex gap-2">
                                    <button className="p-1 px-3 bg-white/5 rounded-full text-[10px] font-bold text-muted hover:text-text">توسيع الغرفة</button>
                                </div>
                            </div>

                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                {[Armchair, Monitor, Lamp, Tv].map((Icon, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const newItem: FurnitureItem = {
                                                id: `f-${Math.random()}`,
                                                type: 'new',
                                                x: Math.floor(Math.random() * 8),
                                                y: Math.floor(Math.random() * 8),
                                                icon: Icon
                                            };
                                            setFurniture([...furniture, newItem]);
                                        }}
                                        className="flex-shrink-0 w-16 h-16 glass-card rounded-2xl flex items-center justify-center border-white/5 hover:border-primary/50 text-muted hover:text-primary transition-all group"
                                        aria-label={`إضافة ${Icon.displayName || 'قطعة أثاث'}`}
                                    >
                                        <Icon size={24} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                ))}
                                <button
                                    className="flex-shrink-0 w-16 h-16 glass-card rounded-2xl flex flex-col items-center justify-center border-dashed border-white/10 text-muted/50 hover:text-text transition-all bg-transparent"
                                    aria-label="المتجر"
                                >
                                    <Plus size={20} />
                                    <span className="text-[8px] font-bold mt-1">المتجر</span>
                                </button>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-[10px] text-muted font-bold px-2">
                                <MousePointer2 size={12} />
                                <span>اسحب القطع لتغيير مكانها (قريباً)</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isEditMode && (
                <div className="glass-panel p-6 rounded-3xl border-accent/20 bg-accent/5 text-center">
                    <p className="text-xs text-muted">هنا حيث تبدأ أحلامك. استمر في جمع الكوينز لشراء المزيد من الأثاث النادر!</p>
                </div>
            )}
        </div>
    );
}
