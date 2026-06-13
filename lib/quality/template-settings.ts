import { createSupabaseServerClient } from '@/lib/db/supabase-server';
import { getActivePersona } from '@/lib/auth/context-service';
import {
    getQualityTemplates,
    getTemplateByCode,
    resolveTemplateDisplayCode,
    isQualityEnabled,
    type QualityModule,
} from '@/lib/quality/tenant-templates';

/**
 * ============================================================================
 * Quality Template Settings Resolver (إعدادات قوالب الجودة لكل مستأجر) — Phase 3E-2
 * ============================================================================
 *
 * وحدة **خادمية فقط**. تَحُلّ إعدادات نموذج جودة (الرمز المعروض · العنوان · الشعار ·
 * الترويسة · التذييل · التفعيل) لمدرسة، بترتيب أسبقية صارم، من DB ثم السجلّ:
 *
 *   1) تجاوز مستوى النموذج   (school_quality_template_overrides scope='form')
 *   2) تجاوز مستوى الوحدة/الدور (school_quality_template_overrides scope='module')
 *   3) افتراض مستوى المدرسة   (school_quality_settings)
 *   4) السجلّ app-code         (lib/quality/tenant-templates.ts) — fallback أخير
 *
 * مبادئ:
 *   - schoolId من سياق persona المصادَق فقط — **لا يُقبَل من العميل** أبداً.
 *   - fail-closed: مدرسة غير مُسجَّلة/جودة معطّلة/رمز غير معروف → null.
 *   - **لا يمسّ generated_forms**: السجلات المُولَّدة تحتفظ برمزها وحمولتها الأصلية؛
 *     هذه الإعدادات تُطبَّق على **التوليد المستقبلي** فقط (تُقرأ وقت التوليد).
 *   - الكتابة (upsert) لـ school_admin (مدرسته) أو system_owner فقط — مُدعَّمة بـ RLS.
 *
 * الجداول (M80): school_quality_settings · school_quality_template_overrides.
 */

// ── أنواع القراءة (الإعدادات المُحَلَّلة) ──
export interface ResolvedQualitySettings {
    schoolId: string;
    templateKey: string;
    module: QualityModule;
    /** الرمز المعروض على الوثيقة (override → registry displayCode → code → key). */
    displayCode: string;
    /** العنوان المُحَلّ (override → registry). */
    title: string;
    /** الشعار (form → module → school → null). */
    logoUrl: string | null;
    headerText: string | null;
    footerText: string | null;
    /** هوية المدرسة في الوثيقة؛ null → يَسقط المُستدعي إلى schools.name. */
    brandName: string | null;
    /** هل النموذج مُفعَّل (form → module → registry.enabled). */
    isEnabled: boolean;
    /** القالب مُنفَّذ فعلاً (يوجد مولّد) — planned=false. */
    implemented: boolean;
}

export type ResolveSettingsResult =
    | { ok: true; settings: ResolvedQualitySettings }
    | {
          ok: false;
          reason: 'unauthenticated' | 'no_school_context' | 'quality_disabled' | 'unknown_template';
      };

interface SchoolSettingsRow {
    logo_url: string | null;
    header_text: string | null;
    footer_text: string | null;
    brand_name: string | null;
}

interface OverrideRow {
    scope: 'module' | 'form';
    module: string | null;
    template_key: string | null;
    display_code: string | null;
    title: string | null;
    logo_url: string | null;
    header_text: string | null;
    footer_text: string | null;
    is_enabled: boolean | null;
}

/**
 * يَحُلّ إعدادات نموذج (عبر رمزه المعتمد/البديل) للمدرسة الحالية بترتيب الأسبقية.
 */
export async function resolveQualityTemplateSettings(formCode: string): Promise<ResolveSettingsResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId) return { ok: false, reason: 'no_school_context' };
    const schoolId = persona.schoolId;

    if (!isQualityEnabled(schoolId)) return { ok: false, reason: 'quality_disabled' };

    const template = getTemplateByCode(schoolId, formCode);
    if (!template) return { ok: false, reason: 'unknown_template' };

    const supabase = await createSupabaseServerClient();

    // افتراض المدرسة + كل تجاوزات المدرسة (عددها محدود بعدد القوالب) — تُرشَّح في JS
    // (أبسط وأأمن من تركيب فلتر .or() مركّب على PostgREST).
    const [{ data: schoolRow }, { data: overrideRows }] = await Promise.all([
        supabase
            .from('school_quality_settings')
            .select('logo_url, header_text, footer_text, brand_name')
            .eq('school_id', schoolId)
            .limit(1)
            .maybeSingle(),
        supabase
            .from('school_quality_template_overrides')
            .select('scope, module, template_key, display_code, title, logo_url, header_text, footer_text, is_enabled')
            .eq('school_id', schoolId),
    ]);

    const school = (schoolRow ?? null) as SchoolSettingsRow | null;
    const overrides = (overrideRows ?? []) as unknown as OverrideRow[];
    const formOverride = overrides.find((o) => o.scope === 'form' && o.template_key === template.key) ?? null;
    const moduleOverride = overrides.find((o) => o.scope === 'module' && o.module === template.module) ?? null;

    const pick = <T,>(...vals: (T | null | undefined)[]): T | null => {
        for (const v of vals) if (v !== null && v !== undefined) return v;
        return null;
    };

    const settings: ResolvedQualitySettings = {
        schoolId,
        templateKey: template.key,
        module: template.module,
        // الرمز المعروض: تجاوز النموذج فقط (لا معنى لرمز عرض على مستوى الوحدة) → ثم app-code
        displayCode: formOverride?.display_code ?? resolveTemplateDisplayCode(template),
        // العنوان: تجاوز النموذج فقط → ثم app-code
        title: formOverride?.title ?? template.title,
        logoUrl: pick(formOverride?.logo_url, moduleOverride?.logo_url, school?.logo_url),
        headerText: pick(formOverride?.header_text, moduleOverride?.header_text, school?.header_text),
        footerText: pick(formOverride?.footer_text, moduleOverride?.footer_text, school?.footer_text),
        brandName: school?.brand_name ?? null,
        isEnabled: formOverride?.is_enabled ?? moduleOverride?.is_enabled ?? template.enabled,
        implemented: template.implemented,
    };

    return { ok: true, settings };
}

// ============================================================================
// الكتابة (إدارة school_admin) — مُدعَّمة بـ RLS؛ school_id من السياق المصادَق فقط
// ============================================================================

export interface SchoolQualitySettingsInput {
    logoUrl?: string | null;
    headerText?: string | null;
    footerText?: string | null;
    brandName?: string | null;
    settings?: Record<string, unknown>;
}

export interface TemplateOverrideInput {
    scope: 'module' | 'form';
    /** مطلوب لنطاق module */
    module?: QualityModule | null;
    /** مطلوب لنطاق form (مفتاح القالب في السجلّ) */
    templateKey?: string | null;
    displayCode?: string | null;
    title?: string | null;
    logoUrl?: string | null;
    headerText?: string | null;
    footerText?: string | null;
    isEnabled?: boolean | null;
    effectiveFrom?: string | null;
    settings?: Record<string, unknown>;
}

export type WriteSettingsResult =
    | { ok: true; id: string }
    | {
          ok: false;
          reason: 'unauthenticated' | 'no_school_context' | 'forbidden' | 'invalid_scope' | 'unknown_template' | 'db_error';
          message?: string;
      };

/** school_admin (مدرسته) أو system_owner فقط يديران إعدادات الجودة. */
function canManageQualitySettings(role: string, isSystemOwner: boolean): boolean {
    return isSystemOwner || role === 'school_admin';
}

/** معرّف persona الحالي (للتدقيق updated_by) — best-effort. */
async function resolveActorPersonaId(
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    userId: string,
    schoolId: string,
    role: string,
): Promise<string | null> {
    const { data } = await supabase
        .from('user_personas')
        .select('id')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .eq('role', role)
        .limit(1)
        .maybeSingle();
    return (data?.id as string | undefined) ?? null;
}

/** إنشاء/تحديث افتراضات الجودة على مستوى المدرسة الحالية. */
export async function upsertSchoolQualitySettings(input: SchoolQualitySettingsInput): Promise<WriteSettingsResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId) return { ok: false, reason: 'no_school_context' };
    if (!canManageQualitySettings(persona.role, !!persona.isSystemOwner)) {
        return { ok: false, reason: 'forbidden' };
    }
    const schoolId = persona.schoolId;
    const supabase = await createSupabaseServerClient();
    const actorId = await resolveActorPersonaId(supabase, persona.userId, schoolId, persona.role);

    const row = {
        school_id: schoolId,
        logo_url: input.logoUrl ?? null,
        header_text: input.headerText ?? null,
        footer_text: input.footerText ?? null,
        brand_name: input.brandName ?? null,
        settings: input.settings ?? {},
        updated_by_persona_id: actorId,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('school_quality_settings')
        .upsert(row, { onConflict: 'school_id' })
        .select('id')
        .single();

    if (error || !data) return { ok: false, reason: 'db_error', message: error?.message };
    return { ok: true, id: data.id as string };
}

/**
 * إنشاء/تحديث تجاوز على مستوى الوحدة أو النموذج للمدرسة الحالية.
 * نطاق form يُتحقَّق من وجود القالب في سجلّ المستأجر (fail-closed لرمز/مفتاح مجهول).
 */
export async function upsertTemplateOverride(input: TemplateOverrideInput): Promise<WriteSettingsResult> {
    const persona = await getActivePersona();
    if (!persona) return { ok: false, reason: 'unauthenticated' };
    if (!persona.schoolId) return { ok: false, reason: 'no_school_context' };
    if (!canManageQualitySettings(persona.role, !!persona.isSystemOwner)) {
        return { ok: false, reason: 'forbidden' };
    }
    const schoolId = persona.schoolId;

    // تحقّق شكل النطاق
    if (input.scope === 'module' && !input.module) return { ok: false, reason: 'invalid_scope' };
    if (input.scope === 'form' && !input.templateKey) return { ok: false, reason: 'invalid_scope' };

    // نطاق form: القالب يجب أن يكون مُسجَّلاً لهذه المدرسة (fail-closed)
    if (input.scope === 'form') {
        const known = getQualityTemplates(schoolId).some((t) => t.key === input.templateKey);
        if (!known) return { ok: false, reason: 'unknown_template' };
    }

    const supabase = await createSupabaseServerClient();
    const actorId = await resolveActorPersonaId(supabase, persona.userId, schoolId, persona.role);

    // upsert يدوي: الفهارس الفريدة جزئية (partial) فلا تصلح كـ onConflict في supabase-js
    const matchCol = input.scope === 'module' ? 'module' : 'template_key';
    const matchVal = input.scope === 'module' ? input.module! : input.templateKey!;

    const { data: existing } = await supabase
        .from('school_quality_template_overrides')
        .select('id')
        .eq('school_id', schoolId)
        .eq('scope', input.scope)
        .eq(matchCol, matchVal)
        .limit(1)
        .maybeSingle();

    const fields = {
        display_code: input.displayCode ?? null,
        title: input.title ?? null,
        logo_url: input.logoUrl ?? null,
        header_text: input.headerText ?? null,
        footer_text: input.footerText ?? null,
        is_enabled: input.isEnabled ?? null,
        effective_from: input.effectiveFrom ?? null,
        settings: input.settings ?? {},
        updated_by_persona_id: actorId,
        updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
        const { data, error } = await supabase
            .from('school_quality_template_overrides')
            .update(fields)
            .eq('id', existing.id)
            .select('id')
            .single();
        if (error || !data) return { ok: false, reason: 'db_error', message: error?.message };
        return { ok: true, id: data.id as string };
    }

    const { data, error } = await supabase
        .from('school_quality_template_overrides')
        .insert({
            school_id: schoolId,
            scope: input.scope,
            // form-scope: module يبقى NULL (يطابق قيد sqto_scope_shape المُشدَّد)
            module: input.scope === 'module' ? input.module : null,
            template_key: input.scope === 'form' ? input.templateKey : null,
            ...fields,
        })
        .select('id')
        .single();

    if (error || !data) return { ok: false, reason: 'db_error', message: error?.message };
    return { ok: true, id: data.id as string };
}
