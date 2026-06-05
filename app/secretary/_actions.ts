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
    _log: Omit<AttendanceLog, 'id' | 'created_at' | 'is_late' | 'employee'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // attendance_logs حُذف في r01_drop_legacy_tables — الاستبدال: staff_attendance_logs (schema مختلف)
    return { ok: false, error: 'سجلات الحضور قيد إعادة التصميم على schema الجديد' };
}

export async function updateInquiryAction(
    _id: string,
    _updates: Partial<Omit<HRInquiry, 'id' | 'employee'>>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // hr_inquiries حُذف في r01_drop_legacy_tables — الاستبدال: hr_accountability_tickets (schema مختلف)
    return { ok: false, error: 'الاستفسارات الوظيفية قيد إعادة التصميم على schema الجديد' };
}

export async function scheduleMeetingAction(
    _meeting: {
        title: string;
        meeting_date: string;
        meeting_time?: string | null;
        location?: string | null;
        description?: string | null;
        meeting_type: string;
        status: string;
    },
    _attendeeIds: string[],
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // meetings + meeting_attendees حُذفا في r01_drop_legacy_tables — الاستبدال: meeting_sessions (schema مختلف)
    return { ok: false, error: 'جدولة الاجتماعات قيد إعادة التصميم على schema الجديد' };
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

export async function submitProcurementAction(_request: {
    request_number: string;
    request_date: string;
    urgency: string | null;
    justification: string | null;
    items: { name: string; qty: number; specs: string }[];
    status: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // procurement_requests حُذف في r01_drop_legacy_tables — لا يوجد جدول بديل محدد بعد
    return { ok: false, error: 'طلبات التوريد قيد إعادة التصميم' };
}

export async function addAssignmentAction(
    _letter: Omit<AssignmentLetter, 'id' | 'created_at'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };
    // assignment_letters حُذف في r01_drop_legacy_tables — لا يوجد جدول بديل محدد بعد
    return { ok: false, error: 'خطابات التكليف قيد إعادة التصميم' };
}
