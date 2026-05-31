'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/db/supabase';
import { MarketplaceItem, MarketplaceItemProps } from './MarketplaceItem';
import { SentinelLedger } from '@/lib/metaverse/ledger';
import { GlassSkeleton } from '../ui/GlassSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { createToast } from '../ui/DynamicIslandToast';
import { OfflineQueue } from '@/lib/metaverse/offline-queue';

export function MarketplaceGrid() {
    const [items, setItems] = useState<MarketplaceItemProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

    useEffect(() => {
        async function fetchItems() {
            setLoading(true);
            const { data, error } = await supabase
                .from('marketplace_items')
                .select('*')
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching marketplace items:', error);
                setError(error.message);
            } else {
                setItems(data || []);
            }
            setLoading(false);
        }

        fetchItems();
    }, []);

    const handlePurchase = async (itemId: string) => {
        // Prevent double-click
        if (isPurchasing) {
            createToast('يرجى الانتظار حتى تكتمل العملية الحالية', 'info');
            return;
        }

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            createToast('يرجى تسجيل الدخول للمتابعة', 'info');
            return;
        }

        setIsPurchasing(itemId);

        const payload = {
            student_id: user.id,
            delta_coins: -item.cost,
            delta_xp: 10,
            type: 'purchase' as const,
            source_type: 'marketplace' as const,
            source_event_id: itemId
        };

        try {
            if (!navigator.onLine) {
                await OfflineQueue.enqueue({
                    id: `buy-${itemId}-${Date.now()}`,
                    type: 'purchase',
                    payload
                });
                createToast('تمت إضافة الطلب لزمام الانتظار (أوفلاين)', 'info');
                return;
            }

            const result = await SentinelLedger.recordTransaction(payload);
            if (result.success) {
                createToast(`مبروك! حصلت على ${item.title}`, 'reward');
            }
        } catch (err: unknown) {
            console.error('Purchase error:', err);

            const msg = err instanceof Error ? err.message : '';
            // Check if it's an idempotency error (already purchased)
            if (msg.includes('duplicate') || msg.includes('unique')) {
                createToast('لقد اشتريت هذا العنصر بالفعل!', 'info');
            } else if (msg.includes('Insufficient')) {
                createToast('رصيدك غير كافٍ لشراء هذا العنصر', 'error');
            } else {
                createToast('حدث خطأ في العملية. يرجى المحاولة لاحقاً.', 'error');
            }
        } finally {
            setIsPurchasing(null);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GlassSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">حدث خطأ أثناء تحميل المتجر: {error}</div>;
    }

    if (items.length === 0) {
        return <div className="text-center py-10 text-muted">لا توجد عناصر متوفرة في المتجر حالياً.</div>;
    }

    return (
        <AnimatePresence>
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
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
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        variants={{
                            hidden: { opacity: 0, x: 30, scale: 0.95 },
                            visible: { opacity: 1, x: 0, scale: 1 }
                        }}
                    >
                        <MarketplaceItem
                            {...item}
                            onPurchase={handlePurchase}
                            isPurchasing={isPurchasing === item.id}
                        />
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
