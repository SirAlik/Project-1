'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

type AR = { ok: boolean; error?: string };

export async function requestLabBookingAction(input: {
    booking_date: string;
    period: number;
    teacher_name: string | null;
    experiment_id?: string;
    experiment_title?: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('lab_bookings').insert([{
        ...input,
        teacher_id: persona.userId,
        school_id: persona.schoolId,
        status: 'pending',
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateLabBookingStatusAction(
    id: string,
    status: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('lab_bookings').update({ status }).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
