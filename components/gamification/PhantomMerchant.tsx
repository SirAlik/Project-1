'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, Zap, Sparkles } from 'lucide-react';
import { GlassModal } from './GlassModal';

export const PhantomMerchant = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <GlassModal isOpen={isOpen} onClose={onClose} title="مكالمة من زقاق الأشباح">
            <div className="flex flex-col items-center text-center space-y-6">
                {/* Merchant Avatar */}
                <div className="relative">
                    <motion.div
                        animate={{
                            y: [0, -10, 0],
                            opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-24 h-24 bg-accent/20 rounded-full blur-2xl absolute inset-0"
                    />
                    <Ghost size={64} className="text-accent relative z-10" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-black text-accent tracking-widest uppercase">تاجر الأشباح</h2>
                    <p className="text-xs text-muted max-w-[250px] mx-auto">
                        {'"لقد وجدتني... خذ ما تشاء بسرعة، فأنا لا أبقى طويلاً في هذا البعد."'}
                    </p>
                </div>

                {/* Secret Items */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    {[
                        { name: 'مفتاح الصندوق الأسطوري', cost: 5000, icon: Zap },
                        { name: 'رداء الظل', cost: 2500, icon: Sparkles },
                    ].map((item, i) => (
                        <button key={i} className="glass-panel p-4 rounded-2xl border-accent/20 hover:border-accent group transition-all">
                            <item.icon size={24} className="mx-auto mb-2 text-accent group-hover:scale-110 transition-transform" />
                            <div className="text-[10px] font-bold mb-1">{item.name}</div>
                            <div className="text-xs font-black text-accent">{item.cost.toLocaleString('en-US')} كوين</div>
                        </button>
                    ))}
                </div>

                <div className="pt-4 border-t border-white/5 w-full text-[10px] text-muted font-bold tabular-nums">
                    يختفي التاجر خلال: 04:22 دقيقة
                </div>
            </div>
        </GlassModal>
    );
};
