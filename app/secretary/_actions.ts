'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import type {
    CorrespondenceRow,
    AttendanceLog,
    HRInquiry,
    AssignmentLetter,
} from '@/lib/types/secretary';

type AR = { ok: boolean; error?: string };

export async function addLetterAction(
    letter: Omit<CorrespondenceRow, 'id' | 'created_at' | 'attachment_url' | 'status'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('secretary_correspondence').insert([{
        ...letter,
        status: letter.type === 'incoming' ? 'received' : 'sent',
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateLetterStatusAction(id: string, status: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('secretary_correspondence').update({ status }).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function deleteLetterAction(id: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('secretary_correspondence').delete().eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function logAttendanceAction(
    log: Omit<AttendanceLog, 'id' | 'created_at' | 'is_late' | 'employee'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('attendance_logs').insert([{
        ...log,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateInquiryAction(
    id: string,
    updates: Partial<Omit<HRInquiry, 'id' | 'employee'>>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('hr_inquiries').update(updates).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function scheduleMeetingAction(
    meeting: {
        title: string;
        meeting_date: string;
        meeting_time?: string | null;
        location?: string | null;
        description?: string | null;
        meeting_type: string;
        status: string;
    },
    attendeeIds: string[],
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { data: meetingData, error: mErr } = await supabase
        .from('meetings')
        .insert([{ ...meeting, school_id: persona.schoolId }])
        .select('id')
        .single();

    if (mErr) return { ok: false, error: mErr.message };

    if (attendeeIds.length > 0) {
        const attendees = attendeeIds.map(eid => ({
            meeting_id: (meetingData as { id: string }).id,
            employee_id: eid,
        }));
        const { error: aErr } = await supabase.from('meeting_attendees').insert(attendees);
        if (aErr) return { ok: false, error: aErr.message };
    }

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
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('employee_leaves').insert([{
        ...leave,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateLeaveStatusAction(id: string, status: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('employee_leaves').update({ status }).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function submitProcurementAction(request: {
    request_number: string;
    request_date: string;
    urgency: string | null;
    justification: string | null;
    items: { name: string; qty: number; specs: string }[];
    status: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('procurement_requests').insert([{
        ...request,
        requested_by: persona.userId,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function addAssignmentAction(
    letter: Omit<AssignmentLetter, 'id' | 'created_at'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('assignment_letters').insert([{
        ...letter,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
