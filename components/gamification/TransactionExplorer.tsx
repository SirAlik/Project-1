'use client';

import React, { useEffect, useState, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, ChevronRight, Cpu, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/db/supabase';

interface TransactionLog {
    id: string;
    delta_coins: number;
    delta_xp: number;
    type: string;
    hash: string;
    prev_hash: string;
    created_at: string;
}

export function TransactionExplorer() {
    const [transactions, setTransactions] = useState<TransactionLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const loadTx = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('transaction_logs')
                .select('*')
                .eq('student_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error('Failed to load ledger', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) startTransition(async () => { await loadTx(); });
    }, [isOpen, loadTx]);

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full glass-panel p-4 rounded-3xl border-primary/20 bg-primary/5 flex items-center justify-between group hover:bg-primary/10 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl group-hover:rotate-12 transition-transform">
                        <Cpu size={18} className="text-primary" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-black">مستكشف الكتل (Ledger)</h3>
                        <p className="text-[10px] text-muted font-bold">تحقق من صحة سجل العملات الرقمية</p>
                    </div>
                </div>
                <ChevronRight className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 pb-4">
                            {transactions.map((tx, idx) => (
                                <motion.div
                                    key={tx.id}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="glass-panel p-3 rounded-2xl border-white/5 bg-white/2 relative overflow-hidden group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--primary)]" />
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-primary">Block #{transactions.length - idx}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-muted">{new Date(tx.created_at).toLocaleTimeString('ar-SA')}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-black tabular-nums ${tx.delta_coins >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {tx.delta_coins >= 0 ? '+' : ''}{tx.delta_coins.toLocaleString('en-US')} Coins
                                            </span>
                                            <span className="text-[8px] text-muted uppercase font-bold">{tx.type}</span>
                                        </div>

                                        <div className="flex-1 max-w-[120px]">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Hash size={10} className="text-muted" />
                                                <span className="text-[8px] font-black text-white/40 uppercase">SHA256 Hash</span>
                                            </div>
                                            <div className="font-mono text-[9px] text-primary truncate bg-black/20 p-1 rounded border border-primary/20">
                                                {tx.hash}
                                            </div>
                                        </div>

                                        <div className="p-1.5 bg-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                                            <ShieldCheck size={14} className="text-primary" />
                                        </div>
                                    </div>

                                    {/* Link to previous */}
                                    {idx < transactions.length - 1 && (
                                        <div className="absolute -bottom-2 left-4 text-white/5">
                                            <LinkIcon size={12} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {transactions.length === 0 && !loading && (
                                <div className="text-center py-10 opacity-40 italic text-xs">
                                    No block data found. Secure your first coins to start the ledger.
                                </div>
                            )}

                            <button className="w-full text-center py-2 text-[9px] font-black text-primary uppercase tracking-[0.2em] hover:bg-white/5 rounded-xl transition-colors">
                                View Full Chain on Sentinel Radar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
