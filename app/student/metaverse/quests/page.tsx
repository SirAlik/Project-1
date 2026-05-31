'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { QuestTree } from '@/components/metaverse/QuestTree';
import { Flag, Info, ArrowRight } from 'lucide-react';
import Link from "next/link";

export default function QuestsPage() {
    return (
        <div className="space-y-6 pt-4 min-h-[120vh]">
            {/* Quests Header */}
            <div className="flex items-center justify-between px-2">
                <h1 className="text-2xl font-black font-heading tracking-tight">خريطة المهام</h1>
                <button className="p-2 glass-panel rounded-full text-muted hover:text-text" aria-label="معلومات">
                    <Info size={20} />
                </button>
            </div>

            {/* Season Progress */}
            <div className="glass-panel p-4 rounded-2xl border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Flag size={16} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">الموسم الأول</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted">ينتهي في: {Number(12).toLocaleString('en-US')} يوم</span>
                </div>
                {/* Added Link and Button */}
                <Link href="/student/metaverse">
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" aria-label="العودة للميتافيرس">
                        <ArrowRight size={20} />
                        <span className="font-bold">العودة</span>
                    </button>
                </Link>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '45%' }}
                        className="h-full bg-primary shadow-[0_0_10px_var(--primary)]"
                    />
                </div>
            </div>

            {/* Quest Tree Map */}
            <QuestTree />

            <div className="py-20" /> {/* Extra scroll space for navigation */}
        </div>
    );
}
