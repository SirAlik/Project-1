'use server';

import { createSupabaseServerClient } from '../db/supabase-server';
import type { Period } from '../types/academic';

export async function getPeriodsForStage(stageId: string): Promise<Period[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('periods')
    .select('id, school_id, school_stage_id, number, label, start_time, end_time')
    .eq('school_stage_id', stageId)
    .order('number');
  return (data ?? []) as Period[];
}

// إيجاد الحصة النشطة بناءً على الوقت الحالي مقارنةً بـ start_time / end_time
// ترجع null إذا لم تُعدَّ حصص أو لا توجد حصة نشطة الآن
export async function getCurrentActivePeriod(stageId: string): Promise<Period | null> {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('periods')
    .select('id, school_id, school_stage_id, number, label, start_time, end_time')
    .eq('school_stage_id', stageId)
    .lte('start_time', currentTime)
    .gt('end_time', currentTime)
    .limit(1)
    .maybeSingle();

  return (data ?? null) as Period | null;
}
