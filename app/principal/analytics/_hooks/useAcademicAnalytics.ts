'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

type DailyMetrics = Record<string, number>;

export function useAcademicAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        // Sprint 7: placeholder غير مربوط بميزة تقدّم المنهج الحقيقية (per-class في
        // /classroom/[classId]). يبقى فارغاً — لا نسبة مُختلَقة على مستوى المدرسة.
        curriculumCompletion: [] as { subject: string; progress: number }[],
        teacherPerformance: [] as { metric: string; score: number; fullMark: number }[],
        gradeTrend: [] as { month: string; average: number }[],
        totalTeachers: 0,
        pendingPlans: 0,
        lessonStability: 0,
        topClasses: [] as { name: string; avg: number }[]
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

            const m = (kpi?.metrics as DailyMetrics) ?? {};

            setStats({
                curriculumCompletion: [],
                teacherPerformance:   [],
                gradeTrend:           [],
                totalTeachers:        0,
                pendingPlans:         0,
                lessonStability:      m.attendance_rate ?? 0,
                topClasses:           [],
            });
        } catch (error) {
            console.error('Academic Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, refresh: loadData };
}
