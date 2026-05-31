'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useCounselorAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeCases: 0,
        sessionsThisMonth: 0,
        recoveryRate: 0,
        pendingReports: 0,
        casePyramid: [] as { name: string; value: number; fill: string }[],
        monthlySessions: [] as { month: string; count: number }[],
        issueLocations: [] as { name: string; value: number }[],
        recentCases: [] as { id: string; title: string; category: string; status: string }[]
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
                    .eq('role', 'student_counselor')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('daily_kpis')
                    .select('date, metrics')
                    .eq('role', 'student_counselor')
                    .gte('date', fromDate)
                    .lte('date', today)
                    .order('date', { ascending: true }),
            ]);

            const m = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = history ?? [];

            const sessionsThisMonth = rows.reduce(
                (sum, r) => sum + (((r.metrics as DailyMetrics) ?? {}).sessions_today ?? 0),
                0,
            );

            const monthlySessions = rows.slice(-6).map(r => ({
                month: (r.date as string).slice(5).replace('-', '/'),
                count: ((r.metrics as DailyMetrics) ?? {}).sessions_today ?? 0,
            }));

            setStats({
                activeCases:      m.cases_open        ?? 0,
                sessionsThisMonth,
                recoveryRate:     0,
                pendingReports:   m.referrals_pending  ?? 0,
                casePyramid:      [],
                monthlySessions,
                issueLocations:   [],
                recentCases:      [],
            });
        } catch (error) {
            console.error('Counselor Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
