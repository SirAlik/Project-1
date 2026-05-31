'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useSecretaryAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingInbox: 0,
        pendingOutbox: 0,
        activeLeaves: 0,
        pendingProcurement: 0,
        avgCompletionDays: 0,
        correspondenceTrend: [] as { month: string; incoming: number; outgoing: number }[],
        recentActions: [] as { id: string; title: string; type: string; status: string; date: string }[]
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 29);
            const fromDate = monthAgo.toISOString().split('T')[0];

            const [{ data: kpi }, { data: history }] = await Promise.all([
                supabase
                    .from('daily_kpis')
                    .select('metrics')
                    .eq('role', 'school_principal')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('daily_kpis')
                    .select('date, metrics')
                    .eq('role', 'school_principal')
                    .gte('date', fromDate)
                    .lte('date', today)
                    .order('date', { ascending: true }),
            ]);

            const m = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = history ?? [];

            const correspondenceTrend = rows.slice(-6).map(r => ({
                month:    (r.date as string).slice(5).replace('-', '/'),
                incoming: ((r.metrics as DailyMetrics) ?? {}).absent_count ?? 0,
                outgoing: ((r.metrics as DailyMetrics) ?? {}).late_count   ?? 0,
            }));

            setStats({
                pendingInbox:       m.absent_count       ?? 0,
                pendingOutbox:      m.late_count         ?? 0,
                activeLeaves:       0,
                pendingProcurement: 0,
                avgCompletionDays:  0,
                correspondenceTrend,
                recentActions:      [],
            });
        } catch (error) {
            console.error('Secretary Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
