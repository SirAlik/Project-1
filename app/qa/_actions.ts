'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

type AR = { ok: boolean; error?: string };

export async function addObservationAction(obs: {
    teacher_id: string;
    class_id: string;
    overall_score: number;
    notes: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('qa_observations').insert([{
        ...obs,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
