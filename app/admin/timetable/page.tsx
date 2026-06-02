import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import {
    TimetableClient,
    type ClassItem,
    type TeacherItem,
    type SubjectItem,
    type TimetableSlotRow,
} from './TimetableClient';

export default async function TimetablePage() {
    const supabase = await createSupabaseServerClient();

    type PersonaWithProfile = {
        user_id: string;
        profiles: { full_name: string } | null;
    };

    const [classesRes, teachersRes, subjectsRes, slotsRes] = await Promise.all([
        supabase.from('classes').select('id, name'),
        supabase
            .from('user_personas')
            .select('user_id, profiles!inner(full_name)')
            .eq('role', 'teacher'),
        supabase.from('subjects').select('id, name_ar'),
        supabase
            .from('timetable_slots')
            .select('class_id, teacher_id, subject_id, day, period'),
    ]);

    const classes = (classesRes.data ?? []) as ClassItem[];

    const teachers: TeacherItem[] = ((teachersRes.data ?? []) as unknown as PersonaWithProfile[]).map(
        p => ({
            id:        p.user_id,
            full_name: p.profiles?.full_name ?? '',
        }),
    );

    const subjects = (subjectsRes.data ?? []) as SubjectItem[];

    const allSlots = (slotsRes.data ?? []) as TimetableSlotRow[];

    return (
        <TimetableClient
            classes={classes}
            teachers={teachers}
            subjects={subjects}
            allSlots={allSlots}
        />
    );
}
