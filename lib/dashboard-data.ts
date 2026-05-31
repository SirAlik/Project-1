'use server';

import { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from './db/supabase-admin';
import { getActivePersona } from './auth/context-service';

// ============================================================
// TYPES
// ============================================================

export interface GlobalStats {
    totalSchools: number;
    totalUsers: number;
    totalTeachers: number;
    totalStudents: number;
    usersWithMissingEmail: number;
    schoolsWithNoAdmin: number;
}

export interface SchoolRow {
    id: string;
    name: string;
    slug: string;
    type: string;
    created_at: string;
    suspended?: boolean;
}

export interface SchoolStats {
    totalStudents: number;
    totalTeachers: number;
    totalStaff: number;
    schoolName: string;
}

// ============================================================
// PURE QUERY FUNCTIONS (DAL Pattern)
// ============================================================

async function queryGlobalStats(supabase: SupabaseClient): Promise<GlobalStats> {
    try {
        const [schoolsRes, usersRes, teachersRes, studentsRes, missingEmailRes] = await Promise.all([
            supabase.from('schools').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
            supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).is('email', null),
        ]);

        return {
            totalSchools: schoolsRes.count || 0,
            totalUsers: usersRes.count || 0,
            totalTeachers: teachersRes.count || 0,
            totalStudents: studentsRes.count || 0,
            usersWithMissingEmail: missingEmailRes.count || 0,
            schoolsWithNoAdmin: 0,
        };
    } catch (error) {
        console.error('[queryGlobalStats] Error:', error);
        return { totalSchools: 0, totalUsers: 0, totalTeachers: 0, totalStudents: 0, usersWithMissingEmail: 0, schoolsWithNoAdmin: 0 };
    }
}

async function querySchoolsList(supabase: SupabaseClient): Promise<SchoolRow[]> {
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('id, name, slug, type, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[querySchoolsList] Error:', error);
            return [];
        }

        return (data || []).map(s => ({ ...s, suspended: false }));
    } catch (error) {
        console.error('[querySchoolsList] Error:', error);
        return [];
    }
}

async function querySchoolStats(supabase: SupabaseClient, schoolId: string): Promise<SchoolStats> {
    try {
        const [schoolRes, studentsRes, teachersRes, staffRes] = await Promise.all([
            supabase.from('schools').select('name').eq('id', schoolId).single(),
            supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
            supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
            supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).in('role', [
                'school_admin', 'school_affairs_vp', 'student_affairs_vp', 'academic_vp',
                'school_principal', 'school_secretary', 'student_counselor', 'health_coordinator',
                'lab_technician', 'school_librarian', 'activity_leader', 'quality_coordinator',
            ]),
        ]);

        return {
            schoolName:     schoolRes.data?.name || 'مدرسة غير معروفة',
            totalStudents:  studentsRes.count || 0,
            totalTeachers:  teachersRes.count || 0,
            totalStaff:     staffRes.count || 0,
        };
    } catch (error) {
        console.error('[querySchoolStats] Error:', error);
        return { schoolName: 'خطأ في التحميل', totalStudents: 0, totalTeachers: 0, totalStaff: 0 };
    }
}

// ============================================================
// CACHED EXPORTS
// ============================================================

export const getCachedGlobalStats = unstable_cache(
    async (): Promise<GlobalStats> => queryGlobalStats(supabaseAdmin),
    ['global-stats'],
    { revalidate: 60 }
);

export const getCachedSchoolsList = unstable_cache(
    async (): Promise<SchoolRow[]> => querySchoolsList(supabaseAdmin),
    ['schools-list'],
    { revalidate: 60 }
);

export async function getCachedSchoolStats(schoolId: string) {
    return unstable_cache(
        async (): Promise<SchoolStats> => querySchoolStats(supabaseAdmin, schoolId),
        [`school-stats-${schoolId}`],
        { revalidate: 60 }
    )();
}

// ============================================================
// ACTIVE PERSONA VALIDATION
// ============================================================

export async function validateSchoolAccess(schoolId: string): Promise<{ valid: boolean; activeSchoolId: string | null }> {
    try {
        const persona = await getActivePersona();

        if (!persona) return { valid: false, activeSchoolId: null };

        if (persona.role === 'system_owner') return { valid: true, activeSchoolId: schoolId };

        if (persona.schoolId !== schoolId) {
            return { valid: false, activeSchoolId: persona.schoolId || null };
        }

        return { valid: true, activeSchoolId: persona.schoolId || null };
    } catch (error) {
        console.error('[validateSchoolAccess] Error:', error);
        return { valid: false, activeSchoolId: null };
    }
}
