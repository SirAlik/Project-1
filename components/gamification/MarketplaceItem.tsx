'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Armchair, Stars, Gift } from 'lucide-react';

export interface MarketplaceItemProps {
    id: string;
    title: string;
    cost: number;
    type: 'furniture' | 'privilege' | 'cosmetic' | 'consumable';
    image_url?: string;
    description: string;
    onPurchase?: (id: string) => void;
    isPurchasing?: boolean;
}

export const MarketplaceItem = ({ id, title, cost, type, image_url, description, onPurchase, isPurchasing }: MarketplaceItemProps) => {
    const Icon = type === 'furniture' ? Armchair : type === 'privilege' ? Stars : Gift;
    const typeColor = type === 'furniture' ? 'text-accent' : type === 'privilege' ? 'text-primary' : 'text-primary';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, boxShadow: 'var(--glow-primary)' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-card overflow-hidden border-white/5 flex flex-col h-full group"
        >
            {/* Item Image / Placeholder */}
            <div className="h-40 bg-surface-2/30 relative flex items-center justify-center overflow-hidden">
                {image_url ? (
                    <Image src={image_url} alt={title} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <div className={`opacity-20 ${typeColor} transition-transform duration-500 group-hover:scale-110`}>
                        <Icon size={72} strokeWidth={1} />
                    </div>
                )}
                <div className="absolute top-3 right-3 glass-panel px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-black/40 border-white/10 backdrop-blur-md">
                    {type}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1 bg-gradient-to-b from-transparent to-white/[0.02]">
                <h3 className="font-bold text-base leading-tight mb-1.5 text-white/90 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-[11px] text-muted leading-relaxed line-clamp-2 mb-4 h-8">{description}</p>

                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                            <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_var(--accent)]" />
                        </div>
                        <span className="text-lg font-black tabular-nums tracking-tight">{cost.toLocaleString('en-US')}</span>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => onPurchase?.(id)}
                        disabled={isPurchasing}
                        className="p-3 bg-primary/10 hover:bg-primary text-primary hover:text-black rounded-2xl transition-all duration-200 border border-primary/20 shadow-lg shadow-primary/5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPurchasing ? (
                            <div className="w-[18px] h-[18px] border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <ShoppingCart size={18} />
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
