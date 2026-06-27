'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import { toSafeError } from '@/lib/safe-error';
import type {
    ActivityEvent,
    ActivityClub,
} from '@/lib/types/activity';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

type FinancialInput = {
    item_name: string;
    category: string;
    amount: number;
    school_year: string;
    date: string;
    notes: string;
    invoice_number?: string;
};

export async function addBudgetItemAction(item: FinancialInput): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('activity_financials').insert([{
        ...item,
        type: 'budget',
        created_by: persona.userId,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function addExpenseAction(expense: FinancialInput): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('activity_financials').insert([{
        ...expense,
        type: 'expense',
        created_by: persona.userId,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function deleteFinancialAction(id: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('activity_financials').delete().eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function addClubAction(
    club: Pick<ActivityClub, 'name' | 'category' | 'description' | 'location' | 'capacity'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('activity_clubs').insert([{
        ...club,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function assignTeacherToClubAction(assignment: {
    club_id: string;
    teacher_id: string;
    role: 'supervisor' | 'assistant';
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    // تحقق أن المعلم ينتمي لنفس المدرسة
    const supabase = await createSupabaseServerClient();
    if (persona.schoolId) {
        const { data: teacherCheck } = await supabase
            .from('user_personas')
            .select('id')
            .eq('user_id', assignment.teacher_id)
            .eq('school_id', persona.schoolId)
            .single();
        if (!teacherCheck) return { ok: false, error: 'المعلم لا ينتمي لهذه المدرسة' };
    }

    const { error } = await supabase.from('club_assignments').insert([{
        ...assignment,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function evaluatePerformanceAction(evaluation: {
    assignment_id: string;
    performance_score: number;
    engagement_score: number;
    notes: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('club_evaluations').insert([{
        ...evaluation,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function submitWishAction(wish: {
    student_id: string;
    first_choice: string;
    second_choice: string;
    third_choice: string;
    school_year: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    // عزل المستأجر: الطالب المُشار إليه يجب أن يتبع مدرسة المُستدعي (دفاع عميق فوق RLS)
    const { data: wishStudent } = await supabase
        .from('student_profiles').select('id')
        .eq('id', wish.student_id).eq('school_id', persona.schoolId).maybeSingle();
    if (!wishStudent) return { ok: false, error: 'الطالب لا ينتمي لهذه المدرسة' };

    const { error } = await supabase.from('student_wishes').upsert([{
        ...wish,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function awardStudentAction(honor: {
    student_id: string;
    reason: string;
    prize: string;
    awarded_date: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    // عزل المستأجر: الطالب المُشار إليه يجب أن يتبع مدرسة المُستدعي (دفاع عميق فوق RLS)
    const { data: honorStudent } = await supabase
        .from('student_profiles').select('id')
        .eq('id', honor.student_id).eq('school_id', persona.schoolId).maybeSingle();
    if (!honorStudent) return { ok: false, error: 'الطالب لا ينتمي لهذه المدرسة' };

    const { error } = await supabase.from('student_honors').insert([{
        ...honor,
        awarded_by: persona.userId,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function createTripAction(trip: {
    title: string;
    destination: string;
    trip_date: string;
    target_classes: string[];
    cost: number;
}): Promise<ARData<{ id: string }>> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('activity_trips').insert([{
        ...trip,
        school_id: persona.schoolId,
    }]).select('id').single();

    if (error) return { ok: false, error: toSafeError('[activity]', error) };

    const tripId = (data as { id: string }).id;

    // توليد موافقات لجميع الطلاب في الفصول المستهدفة
    let studentsQuery = supabase
        .from('student_profiles')
        .select('id')
        .in('class_id', trip.target_classes);
    if (persona.schoolId) studentsQuery = studentsQuery.eq('school_id', persona.schoolId);

    const { data: studentsData } = await studentsQuery;
    if (studentsData && studentsData.length > 0) {
        const consentRows = (studentsData as { id: string }[]).map(s => ({
            trip_id: tripId,
            student_id: s.id,
            unique_link: crypto.randomUUID(),
            parent_consent: false,
            school_id: persona.schoolId,
        }));
        await supabase.from('trip_consents').insert(consentRows);
    }

    return { ok: true, data: { id: tripId } };
}

export async function scheduleActivityEventAction(
    event: Omit<ActivityEvent, 'id' | 'created_at' | 'participants_count'>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('activity_events').insert([{
        ...event,
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function updateActivityEventAction(
    id: string,
    updates: Partial<Omit<ActivityEvent, 'id' | 'created_at'>>,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('activity_events').update(updates).eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}

export async function deleteActivityEventAction(id: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('activity_events').delete().eq('id', id);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: toSafeError('[activity]', error) };
    return { ok: true };
}
