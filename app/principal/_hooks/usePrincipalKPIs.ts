'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/db/supabase';

export interface PrincipalKPIs {
  attendance_rate:    number | null;
  absent_count:       number | null;
  late_count:         number | null;
  behavioral_today:   number | null;
  health_cases_today: number | null;
  lrc_visits_today:   number | null;
  present_today:      number | null;
}

export interface UsePrincipalKPIsResult {
  kpis:    PrincipalKPIs | null;
  loading: boolean;
  date:    string | null;
}

const EMPTY: PrincipalKPIs = {
  attendance_rate:    null,
  absent_count:       null,
  late_count:         null,
  behavioral_today:   null,
  health_cases_today: null,
  lrc_visits_today:   null,
  present_today:      null,
};

export function usePrincipalKPIs(): UsePrincipalKPIsResult {
  const [kpis,    setKpis]    = useState<PrincipalKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [date,    setDate]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('daily_kpis')
          .select('metrics, date')
          .eq('role', 'school_principal')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled) {
          if (data) {
            setKpis(data.metrics as PrincipalKPIs);
            setDate(data.date as string);
          } else {
            setKpis(EMPTY);
          }
        }
      } catch {
        if (!cancelled) setKpis(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  return { kpis, loading, date };
}
