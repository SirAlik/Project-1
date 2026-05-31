'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase } from '@/lib/db/supabase';

export type ClassStats = {
    disciplineScore: number;
    academicScore: number;
    behaviorHeatmap: { day: string; period: number; count: number }[];
    heroTeacher: string;
    needsImprovementTeacher: string;
    massAttendance: { date: string; count: number }[];
    influentialStudents: { name: string; score: number; type: 'positive' | 'negative' }[];
};

export function useClassAnalytics(classId?: string) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ClassStats | null>(null);
    const [className, setClassName] = useState('');

    const loadData = useCallback(async () => {
        if (!classId) return;
        setLoading(true);
        try {
            const [{ data: classInfo }, { data: weekly }] = await Promise.all([
                supabase
                    .from('classes')
                    .select('name')
                    .eq('id', classId)
                    .single(),
                supabase
                    .from('class_weekly_summary')
                    .select('week_start, total_absences, total_lates, total_exits, behavior_incidents, referrals_count, lrc_visits, health_cases')
                    .eq('class_id', classId)
                    .order('week_start', { ascending: false })
                    .limit(8),
            ]);

            if (classInfo) setClassName(classInfo.name as string);

            const rows = weekly ?? [];
            const latest = rows[0];

            const incidents = latest?.behavior_incidents ?? 0;
            const absences  = latest?.total_absences     ?? 0;
            const disciplineScore = Math.max(0, Math.round(100 - incidents * 2 - absences * 0.5));

            const massAttendance = rows
                .filter((r: Record<string, unknown>) => ((r.total_absences as number | null | undefined) ?? 0) > 5)
                .map((r: Record<string, unknown>) => ({ date: r.week_start as string, count: r.total_absences as number }));

            setStats({
                disciplineScore,
                academicScore: 0,
                behaviorHeatmap: [],
                heroTeacher: '',
                needsImprovementTeacher: '',
                massAttendance,
                influentialStudents: [],
            });
        } catch (error) {
            console.error('Class Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => { startTransition(async () => { await loadData(); }); }, [loadData]);
    return { stats, loading, className, refresh: loadData };
}
