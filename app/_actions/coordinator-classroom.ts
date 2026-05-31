'use server';

import { createSafeAction, UserRole } from '@/lib/safe-action';
import { supabaseAdmin } from '@/lib/db/supabase-admin';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Allowed roles: only coordinator (and admins)
const COORDINATOR_ROLES: UserRole[] = ['system_owner', 'school_admin', 'school_principal', 'student_affairs_vp', 'academic_vp', 'school_affairs_vp'];

// === Schemas ===

const getSchoolClassroomsSchema = z.object({
    schoolId: z.string().uuid(),
});

const getClassTimetableSchema = z.object({
    classId: z.string().uuid(),
});

const getSchoolTeachersSchema = z.object({
    schoolId: z.string().uuid(),
});

const assignTeacherSchema = z.object({
    slotId: z.string().uuid(),
    teacherId: z.string().uuid(),
});

// === Actions ===

export const getSchoolClassrooms = createSafeAction({
    schema: getSchoolClassroomsSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'list_classrooms',
        resource: 'classes',
    },

    async handler({ schoolId }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .select('*')
            .eq('school_id', schoolId)
            .order('grade_level', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('[getSchoolClassrooms] Supabase Error:', JSON.stringify(error, null, 2));
            throw new Error(`فشل في جلب الفصول الدراسية: ${error.message}`);
        }

        return data || [];
    },
});

export const getClassTimetable = createSafeAction({
    schema: getClassTimetableSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'view_timetable',
        resource: 'timetable',
    },

    async handler({ classId }) {
        const { data, error } = await supabaseAdmin
            .from('timetable_slots')
            .select(`
        *,
        subjects (id, name_ar, name_en),
        teacher: profiles!teacher_id (id, full_name),
        period: periods (id, number, label, start_time, end_time)
      `)
            .eq('class_id', classId)
            .order('day', { ascending: true });

        if (error) {
            console.error('[getClassTimetable] Error:', error);
            throw new Error('فشل في جلب الجدول الدراسي');
        }

        return data || [];
    },
});

export const getSchoolTeachers = createSafeAction({
    schema: getSchoolTeachersSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'list_teachers',
        resource: 'staff',
    },

    async handler({ schoolId }) {
        const { data, error } = await supabaseAdmin
            .from('user_personas')
            .select(`
        user_id,
        role,
        profiles: user_id (id, full_name, email)
      `)
            .eq('school_id', schoolId)
            .eq('role', 'teacher');

        if (error) {
            console.error('[getSchoolTeachers] Error:', error);
            throw new Error('فشل في جلب قائمة المعلمين');
        }

        type PersonaRow = { user_id: string; role: string; profiles: { id: string; full_name: string; email: string } | null };
        return (data as unknown as PersonaRow[]).map(r => r.profiles).filter(Boolean);
    },
});

export const assignTeacherToSlot = createSafeAction({
    schema: assignTeacherSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'assign_teacher',
        resource: 'timetable',
    },

    async handler({ slotId, teacherId }) {
        const { data, error } = await supabaseAdmin
            .from('timetable_slots')
            .update({ teacher_id: teacherId })
            .eq('id', slotId)
            .select()
            .single();

        if (error) {
            console.error('[assignTeacherToSlot] Error:', error);
            throw new Error('فشل في تعيين المعلم');
        }

        return data;
    },
});

const createClassSchema = z.object({
    schoolId:   z.string().uuid(),
    name:       z.string().min(2, 'اسم الفصل قصير جداً'),
    gradeLevel: z.string().min(1, 'يجب اختيار الصف الدراسي'),
    gender:     z.enum(['boy', 'girl', 'mixed']),
    stageId:    z.string().uuid('يجب اختيار المرحلة الدراسية'),
});

export const createClass = createSafeAction({
    schema: createClassSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'create_class',
        resource: 'classes',
    },

    async handler({ schoolId, name, gradeLevel, gender, stageId }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .insert({
                school_id:   schoolId,
                name,
                grade_level: gradeLevel,
                gender,
                stage_id:    stageId,
            })
            .select()
            .single();

        if (error) {
            console.error('[createClass] Supabase Error:', JSON.stringify(error, null, 2));

            if (error.code === '23505') { // Duplicate unique key
                throw new Error('اسم الفصل هذا مسجل مسبقاً في مدرستك');
            }

            throw new Error(`فشل في إنشاء الفصل: ${error.message}`);
        }

        revalidatePath(`/school/${schoolId}/classroom`);

        return data;
    },
});

const checkClassNameSchema = z.object({
    schoolId: z.string().uuid(),
    name: z.string().min(1),
});

export const checkClassName = createSafeAction({
    schema: checkClassNameSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'check_class_name',
        resource: 'classes',
    },
    async handler({ schoolId, name }) {
        const { data, error } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('school_id', schoolId)
            .eq('name', name)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('[checkClassName] Error:', error);
            return { available: false, error: error.message };
        }

        return { available: !data };
    },
});

const resetSchoolClassesSchema = z.object({
    schoolId: z.string().uuid(),
});

export const resetSchoolClasses = createSafeAction({
    schema: resetSchoolClassesSchema,
    allowedRoles: COORDINATOR_ROLES,
    requiresSchoolContext: true,
    audit: {
        action: 'reset_classes',
        resource: 'classes',
    },
    async handler({ schoolId }) {
        // Delete all classes (and cascading slots)
        const { error } = await supabaseAdmin
            .from('classes')
            .delete()
            .eq('school_id', schoolId);

        if (error) {
            console.error('[resetSchoolClasses] Error:', error);
            throw new Error('فشل في إعادة تعيين الفصول');
        }

        revalidatePath(`/school/${schoolId}/classroom`);
        return { success: true };
    },
});
