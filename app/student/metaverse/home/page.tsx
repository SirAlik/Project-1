'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { GlassWalletBadge } from '@/components/metaverse/GlassWalletBadge';
import { ARScanner } from '@/components/metaverse/ARScanner';
import { TransactionExplorer } from '@/components/metaverse/TransactionExplorer';
import { Flame, Trophy, ChevronLeft, Star } from 'lucide-react';

const student = {
    name: 'أحمد علي',
    level: 12,
    rank: 'خبير سيبراني',
    xp: 4250,
    nextLevelXp: 5000,
    coins: 1240,
    streak: 8,
    dailyQuest: {
        title: 'حل واجب الرياضيات المستقبلي',
        progress: 75,
        reward: 150
    }
};

export default function HomePage() {
    const xpPercentage = (student.xp / student.nextLevelXp) * 100;

    return (
        <div className="space-y-8 pt-4 pb-20 relative">
            {/* Background Dots Logic */}
            <div className="antigravity-dots" />

            {/* Header HUD */}
            <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">مركز العمليات</span>
                    <h1 className="text-xl font-black font-heading truncate max-w-[150px] text-foreground">{student.name}</h1>
                </div>
                <GlassWalletBadge xp={student.xp} coins={student.coins} />
            </div>

            {/* Hero Section: AvatarStage & Level Ring */}
            <section className="relative py-12 flex flex-col items-center">
                {/* Aurora Glow Background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/10 blur-[60px] rounded-full animate-pulse" />

                {/* Level & XP Ring */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="text-muted/10 opacity-20"
                        />
                        <motion.circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="transparent"
                            stroke="var(--primary)"
                            strokeWidth="6"
                            strokeDasharray="552.92"
                            initial={{ strokeDashoffset: 552.92 }}
                            animate={{ strokeDashoffset: 552.92 - (552.92 * xpPercentage) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                            className="drop-shadow-[0_0_10px_var(--primary)]"
                        />
                    </svg>

                    {/* AvatarStage (Breathing) */}
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-36 h-36 rounded-full bg-card/10 backdrop-blur-md p-1.5 border border-primary/20 relative z-10"
                    >
                        <div className="w-full h-full rounded-full overflow-hidden bg-card/50 relative">
                            <Image
                                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=ahmed-123`}
                                alt="Student Avatar"
                                width={144}
                                height={144}
                                className="w-full h-full object-cover scale-110"
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>

                        {/* Level Label */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[12px] font-black px-4 py-1 rounded-full shadow-[0_4px_15px_var(--primary)] border-2 border-background">
                            Lvl {student.level.toLocaleString('en-US')}
                        </div>
                    </motion.div>
                </div>

                {/* Rank Label */}
                <div className="mt-8 text-center">
                    <h2 className="text-xl font-black text-primary tracking-tighter uppercase">{student.rank}</h2>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">تطور الطالب المتميز</p>
                </div>
            </section>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* StreakFlame */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card/10 backdrop-blur-md p-4 rounded-3xl border border-orange-500/20 bg-orange-500/5 relative overflow-hidden group shadow-sm"
                >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/30 blur-md rounded-full group-hover:scale-150 transition-transform" />
                            <Flame size={28} className="text-orange-500 fill-orange-500/30 relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                        </div>
                        <div>
                            <span className="text-lg font-black tabular-nums text-foreground">{student.streak.toLocaleString('en-US')}</span>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">يوم متواصل</p>
                        </div>
                    </div>
                    <div className="absolute right-[-10%] bottom-[-10%] text-orange-500/5 rotate-12">
                        <Flame size={80} />
                    </div>
                </motion.div>

                {/* Global Rank */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card/10 backdrop-blur-md p-4 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden group shadow-sm"
                >
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-500/30 blur-md rounded-full group-hover:scale-150 transition-transform" />
                            <Trophy size={28} className="text-yellow-500 fill-yellow-500/30 relative z-10 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                        </div>
                        <div>
                            <span className="text-lg font-black tabular-nums text-foreground">#124</span>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">الترتيب العام</p>
                        </div>
                    </div>
                    <div className="absolute right-[-10%] bottom-[-10%] text-yellow-500/5 rotate-12">
                        <Trophy size={80} />
                    </div>
                </motion.div>
            </div>

            {/* Daily Quest Preview */}
            <section className="bg-card/10 backdrop-blur-md p-5 rounded-[2rem] border border-primary/20 bg-primary/5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl">
                            <Star size={18} className="text-primary fill-primary/30" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-foreground">المهمة اليومية</h3>
                            <p className="text-[10px] text-muted-foreground font-bold">اربح مكافآت مضاعفة</p>
                        </div>
                    </div>
                    <ChevronLeft size={20} className="text-muted-foreground" />
                </div>

                <div className="space-y-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-foreground/80">{student.dailyQuest.title}</span>
                        <span className="text-[10px] font-black text-primary">+{student.dailyQuest.reward.toLocaleString('en-US')} XP</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>التقدم</span>
                            <span className="tabular-nums">{student.dailyQuest.progress.toLocaleString('en-US')}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${student.dailyQuest.progress}%` }}
                                className="h-full bg-primary shadow-[0_0_10px_var(--primary)]"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Transaction Explorer (Chain Audit) */}
            <TransactionExplorer />

            {/* AR Scanner Quick Access */}
            <ARScanner onScan={(hash) => console.log('Scanned:', hash)} />

            {/* Spacing for Nav */}
            <div className="h-12" />
        </div>
    );
}
