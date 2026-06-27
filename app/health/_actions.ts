'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { toSafeError } from '@/lib/safe-error';
import type { HealthSupply } from '@/lib/types/health';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

export async function addVisitAction(visit: {
    student_id: string;
    student_name: string;
    class_id: string | null;
    complaint: string;
    visit_reason: string;
    action_taken: string;
    date?: string;
    status: 'completed' | 'referred';
}): Promise<ARData<{ id: string }>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    // عزل المستأجر: الطالب المُشار إليه يجب أن يتبع مدرسة المُستدعي (دفاع عميق فوق RLS)
    const { data: visitStudent } = await supabase
        .from('student_profiles').select('id')
        .eq('id', visit.student_id).eq('school_id', persona.schoolId).maybeSingle();
    if (!visitStudent) return { ok: false, error: 'الطالب لا ينتمي لهذه المدرسة' };

    const { data, error } = await supabase.from('health_visits').insert([{
        ...visit,
        school_id: persona.schoolId,
    }]).select('id').single();

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true, data: data as { id: string } };
}

export async function addReferralAction(referral: {
    visit_id: string;
    student_name: string;
    destination: string;
    reason: string;
    parent_notified: boolean;
    notes: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('health_referrals').insert([{
        ...referral,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function addAwarenessAction(event: {
    title: string;
    target_audience: string;
    date: string;
    description: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('health_awareness').insert([{
        ...event,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function addHygieneLogAction(log: Record<string, unknown>): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('hygiene_logs').insert([{
        ...log,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function addCanteenCheckAction(check: Record<string, unknown>): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('canteen_checks').insert([{
        ...check,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function addSupplyItemAction(
    item: Pick<HealthSupply, 'item_name' | 'quantity' | 'category'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('health_supplies').insert([{
        ...item,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function updateSupplyAction(
    id: string,
    updates: Partial<HealthSupply>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('health_supplies')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}

export async function deleteSupplyItemAction(id: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('health_supplies').delete().eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[health]', error) };
    return { ok: true };
}
