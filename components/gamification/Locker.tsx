'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/db/supabase';
import { Package, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSkeleton } from '../ui/GlassSkeleton';

interface InventoryItem {
    id: string;
    item_id: string;
    status: string;
    marketplace_items: {
        title: string;
        type: string;
        image_url: string;
    };
    acquired_at: string;
}

export function Locker() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchInventory() {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setError('يرجى تسجيل الدخول لعرض خزانك');
                    return;
                }

                const { data, error } = await supabase
                    .from('inventory')
                    .select(`
                        id,
                        item_id,
                        status,
                        acquired_at,
                        marketplace_items (
                            title,
                            type,
                            image_url
                        )
                    `)
                    .eq('student_id', user.id);

                if (error) throw error;
                setInventory((data as unknown as InventoryItem[]) || []);
            } catch (err: unknown) {
                console.error('Error fetching inventory:', err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }

        fetchInventory();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GlassSkeleton key={i} className="aspect-square rounded-2xl" />
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-10 text-red-500 text-xs">{error}</div>;
    }

    if (inventory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 glass-panel rounded-3xl border-dashed border-white/10 opacity-50">
                <Package size={40} className="text-muted mb-2" />
                <h3 className="text-sm font-bold">الخزانة خالية</h3>
                <p className="text-[10px] text-muted">لم تكتسب أي عناصر بعد.</p>
            </div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                className="grid grid-cols-3 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.05
                        }
                    }
                }}
            >
                {inventory.map((item) => (
                    <motion.div
                        key={item.id}
                        variants={{
                            hidden: { opacity: 0, x: 20, scale: 0.95 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                        }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className="aspect-square glass-panel p-3 rounded-2xl flex flex-col items-center justify-center relative group overflow-hidden"
                    >
                        {/* Shimmer Effect on Hover */}
                        <div className="absolute inset-x-[-100%] inset-y-0 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:left-[100%] transition-all duration-1000 -skew-x-12" />

                        {item.marketplace_items.image_url ? (
                            <Image src={item.marketplace_items.image_url} alt={item.marketplace_items.title} fill unoptimized className="object-contain transition-transform group-hover:scale-110" />
                        ) : (
                            <Smartphone size={32} className="text-primary/50 group-hover:text-primary transition-colors" />
                        )}
                        <div className="absolute bottom-2 left-0 right-0 text-center px-2">
                            <span className="text-[9px] font-black text-white/70 truncate block uppercase tracking-tighter">{item.marketplace_items.title}</span>
                        </div>
                        {item.status === 'active' && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]" />
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
