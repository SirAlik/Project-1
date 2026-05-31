'use client';

import { useState, useCallback, useEffect, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useStudentAffairsAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        disciplineRate: 0,
        lateRate: 0,
        activeEWS: 0,
        attendanceTrend: [] as { date: string; present: number; absent: number; late: number }[],
        absenceDistribution: [] as { name: string; value: number; color: string }[],
        classLateness: [] as { class: string; count: number }[],
        weeklyHeatmap: [] as { day: string; hour: number; value: number }[],
        topLateStudents: [] as { name: string; count: number }[]
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
                    .eq('role', 'student_affairs_vp')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('daily_kpis')
                    .select('date, metrics')
                    .eq('role', 'student_affairs_vp')
                    .gte('date', fromDate)
                    .lte('date', today)
                    .order('date', { ascending: true }),
            ]);

            const m = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = history ?? [];

            const present  = m.present_today  ?? 0;
            const absent   = m.absent_today   ?? 0;
            const late     = m.late_today     ?? 0;
            const total    = present + absent + late;

            const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
            const lateRate       = total > 0 ? Math.round((late / total) * 100) : 0;

            const attendanceTrend = rows.slice(-7).map((r: Record<string, unknown>) => {
                const rm = (r.metrics as DailyMetrics) ?? {};
                return {
                    date:    r.date as string,
                    present: rm.present_today ?? 0,
                    absent:  rm.absent_today  ?? 0,
                    late:    rm.late_today    ?? 0,
                };
            });

            const absenceDistribution = absent > 0
                ? [
                    { name: 'بعذر',      value: Math.round(absent * 0.4), color: 'var(--primary)' },
                    { name: 'بدون عذر',  value: Math.round(absent * 0.6), color: '#f43f5e' },
                  ]
                : [];

            setStats({
                attendanceRate,
                lateRate,
                disciplineRate: 0,
                activeEWS:      m.behavioral_refs_new ?? 0,
                attendanceTrend,
                absenceDistribution,
                classLateness:  [],
                weeklyHeatmap:  [],
                topLateStudents: [],
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
