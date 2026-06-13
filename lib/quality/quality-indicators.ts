import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';

/**
 * ============================================================================
 * Quality Indicators Resolver (مؤشرات الجودة) — Phase 3E-2
 * ============================================================================
 *
 * وحدة **خادمية فقط**. تقرأ تعريفات مؤشرات الجودة المزروعة للمدرسة الحالية —
 * **لا تُنشئ مؤشرات وهمية ولا أدلة**. fail-closed لمدرسة بلا سياق.
 *
 * بنية `quality_indicators` (مُتحقَّق منها على DB الحية):
 *   id · school_id(NOT NULL) · code(NOT NULL) · name_ar · domain(CHECK) ·
 *   responsible_role · measurement_method · target_value · is_auto_fillable ·
 *   is_active. UNIQUE(school_id, code).
 *
 * domain مقيّد بـ CHECK = (attendance · behavior · academic · health · lrc ·
 *   activity · environment) — وهو taxonomy **منفصل** عن quality_evidence.source_module.
 *
 * الحالة (PRE-LAUNCH): المؤشر الوحيد المزروع والمربوط بسلسلة أدلة حيّة هو ATT-001
 *   (انتظام الطلاب) عبر trigger M78 على period_attendance. باقي الوحدات تُزرع
 *   مؤشراتها عند ربط سلاسل أدلتها (خطوة لاحقة).
 */

export interface QualityIndicator {
    id: string;
    code: string;
    nameAr: string;
    domain: string;
    responsibleRole: string;
    isAutoFillable: boolean;
    isActive: boolean;
    targetValue: number | null;
}

interface IndicatorRow {
    id: string;
    code: string;
    name_ar: string;
    domain: string;
    responsible_role: string;
    is_auto_fillable: boolean;
    is_active: boolean;
    target_value: number | null;
}

function mapIndicator(r: IndicatorRow): QualityIndicator {
    return {
        id: r.id,
        code: r.code,
        nameAr: r.name_ar,
        domain: r.domain,
        responsibleRole: r.responsible_role,
        isAutoFillable: r.is_auto_fillable,
        isActive: r.is_active,
        targetValue: r.target_value,
    };
}

/** مؤشرات الجودة النشطة للمدرسة الحالية (فارغة لمدرسة بلا سياق/مؤشرات مزروعة). */
export async function listQualityIndicators(): Promise<QualityIndicator[]> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return [];

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from('quality_indicators')
        .select('id, code, name_ar, domain, responsible_role, is_auto_fillable, is_active, target_value')
        .eq('school_id', persona.schoolId)
        .eq('is_active', true)
        .order('code');

    return ((data ?? []) as unknown as IndicatorRow[]).map(mapIndicator);
}

/** مؤشر بعينه عبر الكود للمدرسة الحالية (null إن لم يُزرع/غير نشط/بلا سياق). */
export async function getIndicatorByCode(code: string): Promise<QualityIndicator | null> {
    const persona = await getActivePersona();
    if (!persona?.schoolId) return null;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from('quality_indicators')
        .select('id, code, name_ar, domain, responsible_role, is_auto_fillable, is_active, target_value')
        .eq('school_id', persona.schoolId)
        .eq('code', code)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

    return data ? mapIndicator(data as unknown as IndicatorRow) : null;
}

/** هل المؤشر مزروع ونشط وقابل للتعبئة الآلية (شرط توليد دليل آلي له). */
export async function isIndicatorAutoFillReady(code: string): Promise<boolean> {
    const indicator = await getIndicatorByCode(code);
    return !!indicator && indicator.isAutoFillable;
}
