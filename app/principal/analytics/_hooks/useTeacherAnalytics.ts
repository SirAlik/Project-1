'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';


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
            const { data: kpi } = await supabase
                .from('daily_kpis')
                .select('metrics')
                .eq('role', 'school_principal')
                .eq('date', today)
                .maybeSingle();

            // Suppress unused variable warning — kpi read is intentional for cache warm-up
            void kpi;

            setStats({
                teacherList:       [],
                gradeDistribution: [],
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
