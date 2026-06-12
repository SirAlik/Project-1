'use client';

import React, { useEffect, useState, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';
import { QuestNode, QuestNodeProps } from './QuestNode';
import { Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSkeleton } from '../ui/GlassSkeleton';
import { createToast } from '../ui/DynamicIslandToast';

export function QuestTree() {
    const [quests, setQuests] = useState<QuestNodeProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);

    const fetchQuests = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch quest nodes and join with student's progress
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('يرجى تسجيل الدخول لعرض المهام');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('quest_nodes')
                .select(`
                    id,
                    title,
                    path,
                    quest_progress (
                        status
                    )
                `)
                .order('created_at', { ascending: true });

            if (error) throw error;

            type QuestNodeRow = { id: string; title: string; path: string | null; quest_progress: { status: string }[] };
            const formattedQuests: QuestNodeProps[] = ((data ?? []) as unknown as QuestNodeRow[]).map((node, index) => {
                const rawType = node.path?.split('.')[0];
                const type: QuestNodeProps['type'] = (rawType === 'behavior' || rawType === 'social') ? rawType : 'academic';
                return {
                    id: node.id,
                    title: node.title,
                    status: node.quest_progress?.[0]?.status as QuestNodeProps['status'] || 'locked',
                    type,
                    position: index % 3 === 0 ? 'center' : index % 3 === 1 ? 'left' : 'right'
                };
            });

            setQuests(formattedQuests);
        } catch (err: unknown) {
            console.error('Error fetching quests:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        startTransition(async () => { await fetchQuests(); });
    }, [fetchQuests]);

    async function handleQuestClick(questId: string) {
        const quest = quests.find(q => q.id === questId);

        // Only allow completion of available quests
        if (!quest || quest.status !== 'available') {
            if (quest?.status === 'completed') {
                createToast('لقد أكملت هذه المهمة بالفعل!', 'info');
            } else {
                createToast('هذه المهمة غير متاحة بعد', 'info');
            }
            return;
        }

        setCompletingQuestId(questId);

        try {
            // Call secure RPC function
            const { data, error } = await supabase.rpc('rpc_complete_quest', {
                p_quest_node_id: questId
            });

            if (error) throw error;

            if (data.success) {
                // Update local state
                setQuests(prev => prev.map(q =>
                    q.id === questId
                        ? { ...q, status: 'completed' as const }
                        : q
                ));

                // Show success toast with rewards
                const rewards = data.rewards;
                const rewardText = [];
                if (rewards.coins > 0) rewardText.push(`+${rewards.coins} عملة`);
                if (rewards.xp > 0) rewardText.push(`+${rewards.xp} XP`);

                createToast(
                    `مبروك! ${quest.title} - ${rewardText.join(' و ')}`,
                    'reward'
                );
            } else {
                createToast(data.message || 'لم يتم إكمال المهمة', 'info');
            }
        } catch (err: unknown) {
            console.error('Quest completion error:', err);
            createToast('حدث خطأ أثناء إكمال المهمة', 'error');
        } finally {
            setCompletingQuestId(null);
        }
    }

    if (loading) {
        return (
            <div className="relative py-10 flex flex-col items-center gap-12">
                {[1, 2, 3].map((i) => (
                    <GlassSkeleton key={i} variant="circle" className="w-20 h-20" />
                ))}
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }

    if (quests.length === 0) {
        return <div className="text-center py-10 text-muted">لا توجد مهام متاحة حالياً.</div>;
    }

    return (
        <div className="relative py-10 flex flex-col items-center gap-12">
            {/* Background Path Line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent -z-10" />

            <AnimatePresence>
                <motion.div
                    className="flex flex-col items-center gap-12"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                >
                    {quests.map((quest) => (
                        <motion.div
                            key={quest.id}
                            variants={{
                                hidden: { opacity: 0, scale: 0.8 },
                                visible: { opacity: 1, scale: 1 }
                            }}
                            className="relative"
                        >
                            <QuestNode
                                {...quest}
                                onClick={handleQuestClick}
                            />
                            {completingQuestId === quest.id && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Legend/Boss Node Placeholder */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                className="mt-8 relative group"
            >
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-accent/30 flex items-center justify-center text-accent/50 group-hover:text-accent group-hover:border-accent transition-all">
                    <Map size={40} />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-black text-accent uppercase tracking-tighter opacity-50 group-hover:opacity-100">بوس الفصل القادم</span>
                </div>
            </motion.div>
        </div>
    );
}
