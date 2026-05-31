'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useLRCAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        booksBorrowedToday: 0,
        returnRate: 0,
        overdueCount: 0,
        totalBooks: 0,
        categoryDistribution: [] as { name: string; value: number; color: string }[],
        topReaders: [] as { name: string; count: number }[],
        visitHeatmap: [] as { day: string; period: number; value: number }[],
        topBooks: [] as { title: string; count: number }[]
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
                    .eq('role', 'school_librarian')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('daily_kpis')
                    .select('date, metrics')
                    .eq('role', 'school_librarian')
                    .gte('date', fromDate)
                    .lte('date', today)
                    .order('date', { ascending: true }),
            ]);

            const m = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = history ?? [];

            const totalLoansMonth = rows.reduce(
                (sum, r) => sum + (((r.metrics as DailyMetrics) ?? {}).loans_active ?? 0),
                0,
            );
            const totalOverdueMonth = rows.reduce(
                (sum, r) => sum + (((r.metrics as DailyMetrics) ?? {}).overdue_count ?? 0),
                0,
            );
            const returnRate = totalLoansMonth > 0
                ? Math.round(Math.max(0, ((totalLoansMonth - totalOverdueMonth) / totalLoansMonth) * 100))
                : 100;

            setStats({
                booksBorrowedToday:   m.loans_active      ?? 0,
                returnRate,
                overdueCount:         m.overdue_count     ?? 0,
                totalBooks:           0,
                categoryDistribution: [],
                topReaders:           [],
                visitHeatmap:         [],
                topBooks:             [],
            });
        } catch (error) {
            console.error('LRC Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
