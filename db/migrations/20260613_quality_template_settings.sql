-- =================================================================
-- M80: إعدادات قوالب الجودة لكل مستأجر (Editable Quality Template Settings)
-- التاريخ: 2026-06-13  ·  Phase 3E-2
-- =================================================================
-- الهدف: تمكين منسّق المدرسة (school_admin) من إدارة إعدادات نماذج
-- الجودة لمدرسته **بلا تغيير كود** — الرمز المعروض · العنوان · الشعار ·
-- الترويسة · التذييل · التفعيل/التعطيل — على ثلاثة مستويات نطاق:
--   (1) مستوى المدرسة (افتراضات عامة)   → school_quality_settings
--   (2) مستوى الوحدة/الدور (تجاوز جزئي)  → school_quality_template_overrides (scope='module')
--   (3) مستوى نموذج واحد (تجاوز دقيق)     → school_quality_template_overrides (scope='form')
--
-- مبدأ السجلّ التاريخي (إلزامي):
--   هذه الإعدادات **لا تمسّ** generated_forms. السجلات المُولَّدة سابقاً
--   تحتفظ بـ form_code و form_data الأصليين. الإعدادات تُطبَّق فقط على
--   التوليد المستقبلي (تُحَلّ وقت التوليد عبر طبقة الخدمة). لا إعادة كتابة
--   تاريخية صامتة.
--
-- الصلاحيات (RLS):
--   school_admin يدير إعدادات مدرسته فقط (school_id = get_my_school_id()).
--   system_owner يدير كل المدارس. لا دور آخر يكتب. القراءة لموظفي المدرسة.
--   ← سياسات RLS **جديدة على جداول جديدة** (إلزامية بدستور RLS-first)؛
--     لا تعديل لأي سياسة قائمة.
--
-- التبعيات:  ✅ schools · user_personas · get_my_school_id()
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight — الجداول يجب ألا تكون موجودة
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'school_quality_settings'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: school_quality_settings موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'school_quality_template_overrides'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: school_quality_template_overrides موجودة مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. school_quality_settings — افتراضات الجودة على مستوى المدرسة
-- ════════════════════════════════════════════════════════════════
CREATE TABLE public.school_quality_settings (
    id                    uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             uuid        NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,

    -- هوية الوثيقة الرسمية (افتراضات على مستوى المدرسة)
    logo_url              text,                       -- شعار يُستخدم في PDFات الجودة
    header_text           text,                       -- نص ترويسة افتراضي
    footer_text           text,                       -- نص تذييل افتراضي
    -- اسم/هوية المدرسة في الوثائق؛ NULL → يسقط افتراضياً إلى schools.name وقت التوليد
    brand_name            text,

    -- إعدادات تخطيط مرنة إضافية (ألوان/هوامش/توقيعات) — لا حقول حرجة هنا.
    -- ملاحظة: تغيير الرمز المعروض لنموذج بعينه يتم عبر تجاوز مستوى-النموذج (display_code)
    -- في school_quality_template_overrides — لا عبر «نمط رمز» عام (يتطلّب دلالة تحويل ملتبسة
    -- عبر أكواد غير متجانسة: QF03-1 · QF71-A-3-1 · QF-70-j-4-1). تُضاف لاحقاً عند تعريف دلالة واضحة.
    settings              jsonb       NOT NULL DEFAULT '{}'::jsonb,

    updated_by_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_quality_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: موظفو المدرسة + system_owner
CREATE POLICY "sqs_select" ON public.school_quality_settings
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

-- INSERT: school_admin لمدرسته فقط + system_owner
CREATE POLICY "sqs_insert" ON public.school_quality_settings
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

-- UPDATE: school_admin لمدرسته فقط + system_owner
CREATE POLICY "sqs_update" ON public.school_quality_settings
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

-- لا DELETE policy — إعدادات المدرسة تبقى (التعطيل عبر الحقول لا الحذف)

CREATE INDEX idx_sqs_school ON public.school_quality_settings (school_id);

-- ════════════════════════════════════════════════════════════════
-- 2. school_quality_template_overrides — تجاوزات الوحدة/النموذج
-- ════════════════════════════════════════════════════════════════
CREATE TABLE public.school_quality_template_overrides (
    id                    uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

    -- نطاق التجاوز: وحدة كاملة أم نموذج واحد
    scope                 text        NOT NULL CHECK (scope IN ('module', 'form')),

    -- وحدة الجودة (health · secretary · counseling · ...) — مطلوبة لنطاق module
    module                text,
    -- مفتاح القالب في السجلّ (lib/quality/tenant-templates.ts) — مطلوب لنطاق form
    template_key          text,

    -- الحقول القابلة للتجاوز (NULL = يَرِث من المستوى الأعلى)
    display_code          text,       -- الرمز المعروض على الوثيقة (مثل QF19-1 → QF-19-1)
    title                 text,       -- عنوان النموذج
    logo_url              text,
    header_text           text,
    footer_text           text,
    is_enabled            boolean,    -- NULL = يَرِث · true/false = تفعيل/تعطيل صريح

    effective_from        date,       -- تاريخ سريان الإعداد (نسخنة اختيارية)
    settings              jsonb       NOT NULL DEFAULT '{}'::jsonb,

    updated_by_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),

    -- اتساق النطاق: module يلزمه module (بلا template_key)؛ form يلزمه template_key (بلا module)
    CONSTRAINT sqto_scope_shape CHECK (
        (scope = 'module' AND module IS NOT NULL AND template_key IS NULL)
        OR
        (scope = 'form'   AND template_key IS NOT NULL AND module IS NULL)
    )
);

ALTER TABLE public.school_quality_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sqto_select" ON public.school_quality_template_overrides
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

CREATE POLICY "sqto_insert" ON public.school_quality_template_overrides
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

CREATE POLICY "sqto_update" ON public.school_quality_template_overrides
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

CREATE POLICY "sqto_delete" ON public.school_quality_template_overrides
FOR DELETE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

-- تجاوز واحد كحدّ أقصى لكل (مدرسة، وحدة) على مستوى الوحدة
CREATE UNIQUE INDEX idx_sqto_unique_module
    ON public.school_quality_template_overrides (school_id, module)
    WHERE scope = 'module';

-- تجاوز واحد كحدّ أقصى لكل (مدرسة، قالب) على مستوى النموذج
CREATE UNIQUE INDEX idx_sqto_unique_form
    ON public.school_quality_template_overrides (school_id, template_key)
    WHERE scope = 'form';

CREATE INDEX idx_sqto_school_scope ON public.school_quality_template_overrides (school_id, scope);

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rls_s  boolean;
    v_rls_o  boolean;
    v_pol_s  integer;
    v_pol_o  integer;
BEGIN
    SELECT relrowsecurity INTO v_rls_s FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'school_quality_settings';
    SELECT relrowsecurity INTO v_rls_o FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'school_quality_template_overrides';

    IF NOT v_rls_s THEN RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على school_quality_settings'; END IF;
    IF NOT v_rls_o THEN RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على school_quality_template_overrides'; END IF;

    SELECT COUNT(*) INTO v_pol_s FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'school_quality_settings';
    SELECT COUNT(*) INTO v_pol_o FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'school_quality_template_overrides';

    IF v_pol_s < 3 THEN RAISE EXCEPTION 'FAIL: % سياسات على school_quality_settings — المتوقع ≥ 3', v_pol_s; END IF;
    IF v_pol_o < 4 THEN RAISE EXCEPTION 'FAIL: % سياسات على school_quality_template_overrides — المتوقع ≥ 4', v_pol_o; END IF;

    RAISE NOTICE '✅ M80 اكتمل:';
    RAISE NOTICE '   ✓ school_quality_settings — % سياسات (school_admin لمدرسته + system_owner)', v_pol_s;
    RAISE NOTICE '   ✓ school_quality_template_overrides — % سياسات + partial unique لكل نطاق', v_pol_o;
    RAISE NOTICE '   ✓ لا مساس بـ generated_forms — السجلات التاريخية ثابتة';
END $$;

COMMIT;
