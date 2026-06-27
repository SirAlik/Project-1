'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { toSafeError } from '@/lib/safe-error';
import type { CorrespondenceRow } from '@/lib/types/secretary';

type AR = { ok: boolean; error?: string };

export async function addLetterAction(
    letter: Omit<CorrespondenceRow, 'id' | 'created_at' | 'attachment_url' | 'status'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('secretary_correspondence').insert([{
        ...letter,
        status: letter.type === 'incoming' ? 'received' : 'sent',
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[secretary]', error) };
    return { ok: true };
}

export async function updateLetterStatusAction(id: string, status: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('secretary_correspondence').update({ status }).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[secretary]', error) };
    return { ok: true };
}

export async function deleteLetterAction(id: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('secretary_correspondence').delete().eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[secretary]', error) };
    return { ok: true };
}

export async function addLeaveAction(leave: {
    employee_name: string;
    start_date: string;
    end_date: string;
    type: string;
    reason: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('employee_leaves').insert([{
        ...leave,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[secretary]', error) };
    return { ok: true };
}

export async function updateLeaveStatusAction(id: string, status: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('employee_leaves').update({ status }).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[secretary]', error) };
    return { ok: true };
}
