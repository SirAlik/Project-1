'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useLabAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalExperiments: 0,
        experimentTarget: 150,
        occupancyRate: 0,
        assetCondition: [] as { name: string; value: number; color: string }[],
        occupancyHeatmap: [] as { day: string; period: number; value: number }[],
        recentBookings: [] as { id: string; teacher: string; experiment: string; date: string; status: string }[]
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: kpi } = await supabase
                .from('daily_kpis')
                .select('metrics')
                .eq('role', 'quality_coordinator')
                .eq('date', today)
                .maybeSingle();

            const m = (kpi?.metrics as DailyMetrics) ?? {};

            const observations = m.observations_this_week ?? 0;
            const occupancyRate = Math.min(100, Math.round((observations / 35) * 100));

            setStats({
                totalExperiments: observations,
                experimentTarget: 150,
                occupancyRate,
                assetCondition:   [],
                occupancyHeatmap: [],
                recentBookings:   [],
            });
        } catch (error) {
            console.error('Lab Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
