'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useHealthAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        visitsToday: 0,
        totalVisitsMonth: 0,
        caseClassification: [] as { name: string; value: number; color: string }[],
        visitTrend: [] as { day: string; count: number }[],
        hygieneScore: 0,
        canteenStatus: 'جيد',
        recentEmergency: [] as { student: string; reason: string; date: string }[]
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
                    .eq('role', 'health_coordinator')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('daily_kpis')
                    .select('date, metrics')
                    .eq('role', 'health_coordinator')
                    .gte('date', fromDate)
                    .lte('date', today)
                    .order('date', { ascending: true }),
            ]);

            const m = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = history ?? [];

            const totalVisitsMonth = rows.reduce(
                (sum: number, r: Record<string, unknown>) => sum + (((r.metrics as DailyMetrics) ?? {}).visits_today ?? 0),
                0,
            );

            const visitTrend = rows.slice(-7).map((r: Record<string, unknown>) => ({
                day: (r.date as string).slice(5).replace('-', '/'),
                count: ((r.metrics as DailyMetrics) ?? {}).visits_today ?? 0,
            }));

            setStats({
                visitsToday:      m.visits_today ?? 0,
                totalVisitsMonth,
                caseClassification: [],
                visitTrend,
                hygieneScore:     m.supplies_low_count !== undefined
                    ? Math.max(0, 100 - m.supplies_low_count * 5)
                    : 0,
                canteenStatus:    m.canteen_checked ? 'جيد' : 'لم يُتحقَّق',
                recentEmergency:  [],
            });
        } catch (error) {
            console.error('Health Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
