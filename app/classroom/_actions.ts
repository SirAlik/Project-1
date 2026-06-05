'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import type { EventType } from '@/lib/types/classroom';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

type EventPayloadItem = {
    student_id: string;
    student_name_cached?: string;
    type: string;
    note?: string | null;
    actor_role_cached?: string;
    action_category?: string;
    points_delta?: number;
    event_date: string;
    class_id?: string;
};

export async function saveAttendanceAction(
    absentOrLate: { studentId: string; studentName?: string; status: 'absent' | 'late'; note?: string }[],
    classId?: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    if (absentOrLate.length === 0) return { ok: true };

    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];
    const payload = absentOrLate.map(r => ({
        student_id: r.studentId,
        student_name_cached: r.studentName,
        type: r.status === 'absent' ? 'غائب' : 'متأخر',
        actor_role_cached: persona.role,
        created_by: persona.userId,
        note: r.note ?? null,
        event_date: today,
        class_id: classId,
        school_id: persona.schoolId,
    }));

    const { error } = await supabase.from('events').insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function addEventAction(
    payload: EventPayloadItem[],
): Promise<ARData<{ ids: string[] }>> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const rows = payload.map(p => ({
        ...p,
        created_by: persona.userId,
        actor_role_cached: persona.role,
        school_id: persona.schoolId,
    }));

    const { data, error } = await supabase.from('events').insert(rows).select('id');
    if (error) return { ok: false, error: error.message };

    const ids = (data as { id: string }[]).map(d => d.id);
    return { ok: true, data: { ids } };
}

export async function undoEventsAction(ids: string[]): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('events').delete().in('id', ids);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function submitCleaningReportAction(
    _teacherId: string,
    _rating: number,
    _comment: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // cleaning_reports حُذف في r01_drop_legacy_tables — يتطلب إعادة تصميم
    return { ok: false, error: 'تقارير النظافة قيد إعادة التصميم — ستُتاح قريباً' };
}

export async function saveStarsAction(
    stars: { studentId: string; studentName: string }[],
    classId?: string,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const today = new Date().toISOString().split('T')[0];
    const payload = stars.map((s, i) => ({
        student_id: s.studentId,
        student_name_cached: s.studentName,
        type: `نجم الحصة ${i + 1}` as EventType,
        actor_role_cached: persona.role,
        created_by: persona.userId,
        event_date: today,
        class_id: classId,
        school_id: persona.schoolId,
    }));

    const { error } = await supabase.from('events').insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function saveParentNoteAction(
    studentId: string,
    content: string,
    urgency: 'low' | 'medium' | 'high',
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('parent_notes').insert([{
        student_id: studentId,
        teacher_id: persona.userId,
        content,
        urgency,
        school_id: persona.schoolId,
        created_at: new Date().toISOString(),
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function saveSeatingMapAction(
    classId: string | undefined,
    seatingMap: Record<string, { x: number; y: number }>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('classroom_metadata').upsert({
        class_id: classId,
        seating_map: seatingMap,
        school_id: persona.schoolId,
        updated_at: new Date().toISOString(),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function saveStudentRolesAction(
    classId: string | undefined,
    studentRoles: Record<string, string>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('classroom_metadata').upsert({
        class_id: classId,
        student_roles: studentRoles,
        school_id: persona.schoolId,
        updated_at: new Date().toISOString(),
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function syncOfflineQueueAction(
    events: EventPayloadItem[],
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const rows = events.map(e => ({
        ...e,
        created_by: persona.userId,
        actor_role_cached: persona.role,
        school_id: persona.schoolId,
    }));

    const { error } = await supabase.from('events').insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
