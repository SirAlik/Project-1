'use server';
import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import type { BookRow, BookingStatus } from '@/lib/types/lrc';

type AR = { ok: boolean; error?: string };
type ARData<T> = { ok: boolean; error?: string; data?: T };

export async function addBookAction(
    book: Omit<BookRow, 'id' | 'school_id'>,
): Promise<ARData<{ id: string }>> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('lrc_books').insert([{
        ...book,
        school_id: persona.schoolId,
    }]).select('id').single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as { id: string } };
}

export async function borrowBookAction(input: {
    bookId: string;
    borrowerId: string;
    borrowerType: 'student' | 'teacher';
    loanDate: string;
    dueDate: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();

    // Check availability and get current copies
    const { data: book, error: bookErr } = await supabase
        .from('lrc_books')
        .select('available_copies')
        .eq('id', input.bookId)
        .eq('school_id', persona.schoolId)
        .single();

    if (bookErr || !book) return { ok: false, error: 'الكتاب غير موجود' };
    if ((book as { available_copies: number }).available_copies < 1) {
        return { ok: false, error: 'الكتاب غير متوفر حالياً' };
    }

    // Create loan
    const { error: loanErr } = await supabase.from('lrc_loans').insert([{
        book_id: input.bookId,
        borrower_id: input.borrowerId,
        borrower_type: input.borrowerType,
        loan_date: input.loanDate,
        due_date: input.dueDate,
        status: 'active',
        school_id: persona.schoolId,
    }]);

    if (loanErr) return { ok: false, error: loanErr.message };

    // Decrement available copies
    const { error: updateErr } = await supabase
        .from('lrc_books')
        .update({ available_copies: (book as { available_copies: number }).available_copies - 1 })
        .eq('id', input.bookId)
        .eq('school_id', persona.schoolId);

    if (updateErr) return { ok: false, error: updateErr.message };
    return { ok: true };
}

export async function returnBookAction(loanId: string, bookId: string): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();

    let loanQuery = supabase.from('lrc_loans')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('id', loanId);
    if (persona.schoolId) loanQuery = loanQuery.eq('school_id', persona.schoolId);

    const { error: loanErr } = await loanQuery;
    if (loanErr) return { ok: false, error: loanErr.message };

    // Increment available copies
    const { data: book } = await supabase
        .from('lrc_books')
        .select('available_copies')
        .eq('id', bookId)
        .single();

    if (book) {
        await supabase.from('lrc_books')
            .update({ available_copies: (book as { available_copies: number }).available_copies + 1 })
            .eq('id', bookId);
    }

    return { ok: true };
}

export async function startClassVisitAction(input: {
    classId: string;
    teacherPersonaId: string;
    period: number;
    topic: string;
    visitDate: string;
    studentIds: { id: string; name: string }[];
}): Promise<ARData<{ visitId: string }>> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();

    const { data: visit, error: vErr } = await supabase.from('lrc_visits').insert([{
        class_id: input.classId,
        teacher_persona_id: input.teacherPersonaId,
        visit_date: input.visitDate,
        topic: input.topic,
        status: 'confirmed',
        school_id: persona.schoolId,
    }]).select('id').single();

    if (vErr || !visit) return { ok: false, error: vErr?.message ?? 'فشل إنشاء الزيارة' };

    const visitId = (visit as { id: string }).id;

    if (input.studentIds.length > 0) {
        const attendanceRows = input.studentIds.map(s => ({
            visit_id: visitId,
            student_id: s.id,
            is_present: true,
            is_excluded: false,
            school_id: persona.schoolId,
        }));
        const { error: aErr } = await supabase.from('lrc_visit_attendance').insert(attendanceRows);
        if (aErr) return { ok: false, error: aErr.message };
    }

    return { ok: true, data: { visitId } };
}

export async function requestLrcBookingAction(input: {
    teacherPersonaId: string;
    classId: string;
    bookingDate: string;
    period: number;
    subject: string;
}): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('lrc_bookings').insert([{
        teacher_persona_id: input.teacherPersonaId,
        class_id: input.classId,
        booking_date: input.bookingDate,
        period_id: null,
        subject: input.subject,
        status: 'pending',
        school_id: persona.schoolId,
    }]);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function updateLrcBookingStatusAction(
    bookingId: string,
    status: BookingStatus,
): Promise<AR> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, error: 'غير مصرح' };

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('lrc_bookings').update({ status }).eq('id', bookingId);
    if (persona.schoolId) query = query.eq('school_id', persona.schoolId);

    const { error } = await query;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
