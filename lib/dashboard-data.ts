'use server';

import { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from './db/supabase-admin';
import { getActivePersona } from './auth/context-service';
import { toSafeNumber } from './utils';

// ============================================================
// TYPES
// ============================================================

export interface RoleCount {
    role: string;
    count: number;
}

export interface PlatformStats {
    totalSchools: number;
    totalUsers: number;
    totalPersonas: number;
    totalTeachers: number;
    totalStudents: number;
    usersWithMissingEmail: number;
    schoolsWithoutAdmin: number;   // محسوب فعليًا من user_personas (role=school_admin) مقابل المدارس
    roleDistribution: RoleCount[]; // توزيع الأدوار الفعلي عبر user_personas
}

export interface AuditEntry {
    id: string;
    action_name: string;
    role: string | null;
    school_id: string | null;
    status: string | null;
    created_at: string;
}

export interface PlatformAudit {
    connected: boolean;   // هل نجحت القراءة من action_audit_log (وإلا حالة فارغة صادقة)
    entries: AuditEntry[];
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
    totalClasses: number;
    schoolName: string;
}

// ============================================================
// PURE QUERY FUNCTIONS (DAL Pattern)
// ============================================================

async function queryPlatformStats(supabase: SupabaseClient): Promise<PlatformStats> {
    const empty: PlatformStats = {
        totalSchools: 0, totalUsers: 0, totalPersonas: 0, totalTeachers: 0,
        totalStudents: 0, usersWithMissingEmail: 0, schoolsWithoutAdmin: 0, roleDistribution: [],
    };
    try {
        const [schoolsRes, usersRes, personasRes, teachersRes, studentsRes, missingEmailRes, adminPersonasRes, allRolesRes] =
            await Promise.all([
                supabase.from('schools').select('id'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('user_personas').select('*', { count: 'exact', head: true }),
                supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
                supabase.from('user_personas').select('*', { count: 'exact', head: true }).eq('role', 'student'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).is('email', null),
                supabase.from('user_personas').select('school_id').eq('role', 'school_admin'),
                supabase.from('user_personas').select('role'),
            ]);

        // المدارس التي بلا منسق (school_admin) — حساب فعلي
        const schoolIds = ((schoolsRes.data ?? []) as { id: string }[]).map(s => s.id);
        const adminSchoolIds = new Set(
            ((adminPersonasRes.data ?? []) as { school_id: string | null }[])
                .map(p => p.school_id)
                .filter((v): v is string => Boolean(v)),
        );
        const schoolsWithoutAdmin = schoolIds.filter(id => !adminSchoolIds.has(id)).length;

        // توزيع الأدوار الفعلي
        const roleCounts = new Map<string, number>();
        for (const row of (allRolesRes.data ?? []) as { role: string }[]) {
            roleCounts.set(row.role, (roleCounts.get(row.role) ?? 0) + 1);
        }
        const roleDistribution: RoleCount[] = [...roleCounts.entries()]
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalSchools: schoolIds.length,
            totalUsers: usersRes.count ?? 0,
            totalPersonas: personasRes.count ?? 0,
            totalTeachers: teachersRes.count ?? 0,
            totalStudents: studentsRes.count ?? 0,
            usersWithMissingEmail: missingEmailRes.count ?? 0,
            schoolsWithoutAdmin,
            roleDistribution,
        };
    } catch (error) {
        console.error('[queryPlatformStats] Error:', error);
        return empty;
    }
}

// قراءة دفاعية لسجل التدقيق — إن فشلت (جدول/أعمدة غير متوفّرة) نعيد connected=false لحالة فارغة صادقة
async function queryRecentAudit(supabase: SupabaseClient, limit: number): Promise<PlatformAudit> {
    try {
        const { data, error } = await supabase
            .from('action_audit_log')
            .select('id, action_name, role, school_id, status, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[queryRecentAudit] Error:', error);
            return { connected: false, entries: [] };
        }
        return { connected: true, entries: (data ?? []) as AuditEntry[] };
    } catch (error) {
        console.error('[queryRecentAudit] Error:', error);
        return { connected: false, entries: [] };
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

        // عدد الفصول — قراءة معزولة بـ try خاص حتى لا يُسقِط فشلُها بقيةَ العدّادات (degrade → 0).
        let totalClasses = 0;
        try {
            const classesRes = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId);
            totalClasses = classesRes.count || 0;
        } catch (classesError) {
            console.error('[querySchoolStats] classes count failed:', classesError);
        }

        return {
            schoolName:     schoolRes.data?.name || 'مدرسة غير معروفة',
            totalStudents:  studentsRes.count || 0,
            totalTeachers:  teachersRes.count || 0,
            totalStaff:     staffRes.count || 0,
            totalClasses,
        };
    } catch (error) {
        console.error('[querySchoolStats] Error:', error);
        return { schoolName: 'خطأ في التحميل', totalStudents: 0, totalTeachers: 0, totalStaff: 0, totalClasses: 0 };
    }
}

// قراءة دفاعية لسجل تدقيق المدرسة (معزول بـ school_id) — حالة فارغة صادقة عند الفشل.
async function querySchoolAudit(supabase: SupabaseClient, schoolId: string, limit: number): Promise<PlatformAudit> {
    try {
        const { data, error } = await supabase
            .from('action_audit_log')
            .select('id, action_name, role, school_id, status, created_at')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[querySchoolAudit] Error:', error);
            return { connected: false, entries: [] };
        }
        return { connected: true, entries: (data ?? []) as AuditEntry[] };
    } catch (error) {
        console.error('[querySchoolAudit] Error:', error);
        return { connected: false, entries: [] };
    }
}

// ============================================================
// CACHED EXPORTS
// ============================================================

export const getCachedPlatformStats = unstable_cache(
    async (): Promise<PlatformStats> => queryPlatformStats(supabaseAdmin),
    ['platform-stats'],
    { revalidate: 60 }
);

export const getCachedRecentAudit = unstable_cache(
    async (): Promise<PlatformAudit> => queryRecentAudit(supabaseAdmin, 8),
    ['recent-audit'],
    { revalidate: 30 }
);

export const getCachedSchoolsList = unstable_cache(
    async (): Promise<SchoolRow[]> => querySchoolsList(supabaseAdmin),
    ['schools-list'],
    { revalidate: 60 }
);

// تطبيع عقد إحصاءات المدرسة: يضمن أرقاماً كاملة آمنة حتى لو خدم الكاش شكلاً قديماً
// (مثل إدخال سابق لإضافة totalClasses) أو رجعت بيانات جزئية — فلا يصل undefined إلى طبقة العرض.
function normalizeSchoolStats(raw: Partial<SchoolStats> | null | undefined): SchoolStats {
    return {
        schoolName:    raw?.schoolName || 'مدرسة غير معروفة',
        totalStudents: toSafeNumber(raw?.totalStudents),
        totalTeachers: toSafeNumber(raw?.totalTeachers),
        totalStaff:    toSafeNumber(raw?.totalStaff),
        totalClasses:  toSafeNumber(raw?.totalClasses),
    };
}

export async function getCachedSchoolStats(schoolId: string): Promise<SchoolStats> {
    // مفتاح الكاش مُرقّى (v2) بعد إضافة totalClasses حتى لا يُخدَم أي إدخال قديم بلا الحقل الجديد.
    const raw = await unstable_cache(
        async (): Promise<SchoolStats> => querySchoolStats(supabaseAdmin, schoolId),
        [`school-stats-v2-${schoolId}`],
        { revalidate: 60 }
    )();
    return normalizeSchoolStats(raw);
}

export async function getCachedSchoolAudit(schoolId: string) {
    return unstable_cache(
        async (): Promise<PlatformAudit> => querySchoolAudit(supabaseAdmin, schoolId, 8),
        [`school-audit-${schoolId}`],
        { revalidate: 30 }
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
