'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export type TeacherScore = {
    id: string;
    name: string;
    avgScore: number;
    attendance: number;
    curriculumProgress: number;
    studentAvg: number;
};

export type TeacherDeepDive = {
    id: string;
    name: string;
    radarData: { metric: string; score: number; fullMark: number }[];
    curriculumDetails: { subject: string; progress: number }[];
    visitHistory: { date: string; score: number }[];
    studentSatisfaction: number;
};

export function useTeacherAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        teacherList: [] as TeacherScore[],
        gradeDistribution: [] as { name: string; score: number; type: 'easy' | 'strict' | 'vibrant' }[],
        heatMap: [] as { day: string; period: number; status: 'busy' | 'free' | 'sub' }[],
        individual: null as TeacherDeepDive | null
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 27); // ~4 أسابيع ماضية
            const fromDate = weekAgo.toISOString().split('T')[0];

            const [{ data: kpi }, { data: weekly }] = await Promise.all([
                supabase
                    .from('daily_kpis')
                    .select('metrics')
                    .eq('role', 'school_principal')
                    .eq('date', today)
                    .maybeSingle(),
                supabase
                    .from('class_weekly_summary')
                    .select('class_id, week_start, total_absences, total_lates, behavior_incidents')
                    .gte('week_start', fromDate)
                    .order('week_start', { ascending: false })
                    .limit(40),
            ]);

            const m    = (kpi?.metrics as DailyMetrics) ?? {};
            const rows = weekly ?? [];

            // معدل الحضور المدرسي كخط أساس لحساب درجة كل شعبة
            const schoolAvg = m.attendance_rate ?? 80;

            // gradeDistribution: أداء الشعب في آخر 4 أسابيع
            // الدرجة = خط أساس الحضور − جزاء الغياب − جزاء السلوك
            const seen = new Set<string>();
            const gradeDistribution = rows
                .filter((r: Record<string, unknown>) => {
                    const key = r.class_id as string;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
                .slice(0, 10)
                .map((r: Record<string, unknown>) => {
                    const incidents = (r.behavior_incidents as number) ?? 0;
                    const absences  = (r.total_absences   as number) ?? 0;
                    const score = Math.max(0, Math.round(schoolAvg - incidents * 3 - absences * 0.5));
                    return {
                        name:  (r.week_start as string).slice(5).replace('-', '/'),
                        score,
                        type: (score >= 80 ? 'vibrant' : score >= 60 ? 'easy' : 'strict') as
                              'easy' | 'strict' | 'vibrant',
                    };
                });

            setStats({
                teacherList:       [], // يتطلب كاش خاص بالمعلمين — غير متوفر بعد
                gradeDistribution,
                heatMap:           [],
                individual:        null,
            });
        } catch (error) {
            console.error('Teacher Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
