'use client';

import React, { useState } from 'react';
import { MarketplaceGrid } from '@/components/metaverse/MarketplaceGrid';
import { ArrowRight, Sparkles, Ghost, Gavel } from "lucide-react";
import Link from "next/link";
import { motion } from 'framer-motion';

export default function CityPage() {
    const [activeTab, setActiveTab] = useState<'items' | 'phantom' | 'auction'>('items');

    return (
        <div className="space-y-6 pt-4">
            {/* City Header */}
            <div className="flex items-center justify-between px-2">
                <h1 className="text-2xl font-black font-heading tracking-tight">المدينة الرقمية</h1>
                <Link href="/student/metaverse">
                    <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors" aria-label="العودة للميتافيرس">
                        <ArrowRight size={20} />
                        <span>العودة للميتافيرس</span>
                    </button>
                </Link>
            </div>

            {/* Navigation Sub-Tabs */}
            <div className="flex p-1 bg-white/5 rounded-2xl gap-1">
                {(['items', 'phantom', 'auction'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'text-muted hover:bg-white/5'
                            }`}
                    >
                        {tab === 'items' && <Sparkles size={16} />}
                        {tab === 'phantom' && <Ghost size={16} />}
                        {tab === 'auction' && <Gavel size={16} />}
                        {tab === 'items' ? 'المتجر' : tab === 'phantom' ? 'زقاق الأشباح' : 'المزاد'}
                    </button>
                ))}
            </div>

            {/* View Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
            >
                {activeTab === 'items' && (
                    <>
                        <MarketplaceGrid />

                        {/* Furniture Banner */}
                        <div className="glass-panel p-6 rounded-3xl border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden group">
                            <div className="relative z-10 space-y-2">
                                <h3 className="text-lg font-bold text-accent">متجر الأثاث</h3>
                                <p className="text-xs text-muted max-w-[180px]">قم بتزيين سكنك الرقمي بأفضل القطع الحصرية هذا الموسم.</p>
                                <button className="text-xs font-bold text-accent underline underline-offset-4">تصفح الأثاث</button>
                            </div>
                            <Armchair className="absolute -right-4 -bottom-4 w-32 h-32 text-accent/10 transform rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                        </div>
                    </>
                )}

                {activeTab === 'phantom' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center animate-pulse">
                            <Ghost size={40} className="text-accent" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">تاجر الأشباح غير متوفر</h3>
                            <p className="text-sm text-muted">يظهر التاجر فقط في ساعات الغسق (8:00م - 4:00ص).</p>
                        </div>
                    </div>
                )}

                {activeTab === 'auction' && (
                    <div className="glass-panel p-4 rounded-2xl border-yellow-500/20 text-center py-12">
                        <Gavel size={32} className="mx-auto text-yellow-500 mb-4" />
                        <h3 className="font-bold">لا توجد مزادات نشطة</h3>
                        <p className="text-xs text-muted mt-1">المزادات تبدأ قريباً! ترقبوا القطع الأسطورية.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

const Armchair = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
        <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H7v-2a2 2 0 0 0-4 0Z" />
        <path d="M5 18v2" />
        <path d="M19 18v2" />
    </svg>
);
