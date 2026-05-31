"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, WifiOff } from 'lucide-react';
import { useSyncEngine } from '@/lib/metaverse/sync-engine';

export function SyncPill() {
    const { isSyncing, isOnline } = useSyncEngine();


    return (
        <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
            suppressHydrationWarning
        >
            <AnimatePresence>
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        className="bg-destructive/10 backdrop-blur-xl border border-destructive/30 px-4 py-2 rounded-full flex items-center gap-2 mb-2"
                    >
                        <WifiOff size={14} className="text-destructive" />
                        <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Offline Mode</span>
                    </motion.div>
                )}

                {isSyncing && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        className="bg-primary/10 backdrop-blur-xl border border-primary/30 px-4 py-2 rounded-full flex items-center gap-2"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <RefreshCcw size={14} className="text-primary" />
                        </motion.div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Syncing with Sentinel...</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
