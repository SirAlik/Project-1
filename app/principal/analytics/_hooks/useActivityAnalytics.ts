'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useActivityAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        participationRate: 0,
        activeClubs: 0,
        totalEvents: 0,
        upcomingEvents: 0,
        clubPopularity: [] as { name: string; value: number; members: number }[],
        eventTimeline: [] as { name: string; date: string; status: 'completed' | 'upcoming'; color: string }[],
        studentEngagementTrend: [] as { month: string; rate: number }[]
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

            const studentEngagementTrend = rows.slice(-6).map((r: Record<string, unknown>) => ({
                month: (r.date as string).slice(5).replace('-', '/'),
                rate:  ((r.metrics as DailyMetrics) ?? {}).attendance_rate ?? 0,
            }));

            setStats({
                participationRate:      m.attendance_rate ?? 0,
                activeClubs:            0,
                totalEvents:            0,
                upcomingEvents:         0,
                clubPopularity:         [],
                eventTimeline:          [],
                studentEngagementTrend,
            });
        } catch (error) {
            console.error('Activity Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
