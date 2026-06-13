import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

/**
 * ============================================================================
 * Academic Year Resolver (السنة الدراسية) — Phase 3E-2
 * ============================================================================
 *
 * وحدة **خادمية فقط**. تَحُلّ السنة الدراسية النشطة للمدرسة من قاعدة البيانات —
 * **لا تُثبَّت سنة في منطق الأعمال**. fail-closed لمدرسة بلا سياق/سنة نشطة.
 *
 * بنية `academic_years` (مُتحقَّق منها على DB الحية 2026-06-13):
 *   id · school_id(NOT NULL) · name(NOT NULL) · start_date · end_date · is_active.
 *   UNIQUE(school_id, name). RLS: SELECT لموظفي المدرسة + system_owner.
 *
 * الزرع الأوّلي (M81): سنة نشطة واحدة للفلاح. التدوير لاحقاً تحت إدارة school_admin.
 */

export interface ActiveAcademicYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export type ResolveActiveYearResult =
    | { ok: true; year: ActiveAcademicYear }
    | { ok: false; reason: 'unauthenticated' | 'no_school_context' | 'no_active_academic_year' };

/**
 * السنة الدراسية النشطة للمدرسة الحالية (من سياق persona المصادَق — لا schoolId من العميل).
 */
export async function resolveActiveAcademicYear(): Promise<ResolveActiveYearResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId) return { ok: false, reason: 'no_school_context' };

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date')
        .eq('school_id', persona.schoolId)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!data?.id) return { ok: false, reason: 'no_active_academic_year' };

    return {
        ok: true,
        year: {
            id: data.id as string,
            name: data.name as string,
            startDate: data.start_date as string,
            endDate: data.end_date as string,
        },
    };
}

/** هل للمدرسة الحالية سنة دراسية نشطة (جاهزية الأدلة). */
export async function hasActiveAcademicYear(): Promise<boolean> {
    return (await resolveActiveAcademicYear()).ok;
}
