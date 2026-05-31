'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award, Shield, Cpu, BookOpen, History, Landmark } from 'lucide-react';
import { Locker } from '@/components/metaverse/Locker';

const BADGES = [
    { id: 'b1', title: 'عالم الحواسيب', icon: Cpu, color: 'text-primary' },
    { id: 'b2', title: 'خبير القراءة', icon: BookOpen, color: 'text-accent' },
    { id: 'b3', title: 'المدافع القوي', icon: Shield, color: 'text-yellow-500' },
];

const LEGENDS = [
    { id: 'l1', name: 'خالد محمد', title: 'أول من وصل للمستوى 50', season: 'ربيع 2025' },
    { id: 'l2', name: 'سارة أحمد', title: 'سفيرة الابتكار', season: 'شتاء 2024' },
];

export default function ProfilePage() {
    return (
        <div className="space-y-8 pt-4 pb-20">
            {/* Profile Top */}
            <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl glass-panel p-1 border-primary/20 rotate-3 overflow-hidden">
                    <Image
                        src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=ahmed-123`}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="w-full h-full transform scale-110"
                        unoptimized
                    />
                </div>
                <h1 className="mt-4 text-2xl font-black font-heading tracking-tight">أحمد علي</h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted font-bold uppercase tracking-widest">
                    <span>المستوى {Number(12).toLocaleString('en-US')}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>فصل 6/أ</span>
                </div>
            </div>

            {/* Stats Breakdown */}
            <section className="grid grid-cols-3 gap-3">
                {[
                    { label: 'المهام', val: 42 },
                    { label: 'الأثاث', val: 18 },
                    { label: 'البدج', val: 5 },
                ].map((stat, i) => (
                    <div key={i} className="glass-panel p-3 rounded-2xl text-center border-white/5">
                        <span className="block text-lg font-black tabular-nums">{stat.val.toLocaleString('en-US')}</span>
                        <span className="text-[8px] font-bold text-muted uppercase tracking-tighter">{stat.label}</span>
                    </div>
                ))}
            </section>

            {/* Digital Locker */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-widest">خزانتي الرقمية</h3>
                    <button className="text-[10px] font-bold text-primary underline underline-offset-4">تخصيص</button>
                </div>
                <Locker />
            </section>

            {/* Badges Collection */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-bold text-muted uppercase tracking-widest">مجموعة الأوسمة</h3>
                    <button className="text-[10px] font-bold text-primary underline underline-offset-4">المزيد</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none px-2 text-center">
                    {BADGES.map((badge) => {
                        const Icon = badge.icon;
                        return (
                            <motion.div
                                key={badge.id}
                                whileHover={{ y: -5 }}
                                className="flex-shrink-0 flex flex-col items-center gap-2"
                            >
                                <div className={`w-14 h-14 rounded-2xl glass-panel border-white/10 flex items-center justify-center ${badge.color}`}>
                                    <Icon size={24} />
                                </div>
                                <span className="text-[9px] font-bold max-w-[60px] leading-tight">{badge.title}</span>
                            </motion.div>
                        );
                    })}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2 opacity-30 grayscale">
                        <div className="w-14 h-14 rounded-2xl glass-panel border-dashed border-white/20 flex items-center justify-center">
                            <Award size={24} />
                        </div>
                        <span className="text-[9px] font-bold">؟؟؟</span>
                    </div>
                </div>
            </section>

            {/* Hall of Legends */}
            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-accent" />
                        <h3 className="text-xs font-bold text-muted uppercase tracking-widest">بروتوكول الإرث</h3>
                    </div>
                </div>

                <div className="space-y-3">
                    {LEGENDS.map((legend) => (
                        <div key={legend.id} className="glass-panel p-4 rounded-2xl border-accent/20 bg-accent/5 flex items-center gap-4 group">
                            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
                                <Landmark size={24} />
                            </div>
                            <div className="flex-1 text-right">
                                <h4 className="font-bold text-sm group-hover:text-accent transition-colors">{legend.name}</h4>
                                <p className="text-[10px] text-muted">{legend.title}</p>
                            </div>
                            <div className="text-[10px] font-bold text-accent/50 tabular-nums">
                                {legend.season}
                            </div>
                        </div>
                    ))}

                    <button className="w-full py-3 glass-panel rounded-2xl border-dashed border-white/5 text-[10px] font-bold text-muted hover:text-text transition-colors">
                        تصفح متحف الأبطال بالكامل
                    </button>
                </div>
            </section>

            <div className="py-12" />
        </div>
    );
}
