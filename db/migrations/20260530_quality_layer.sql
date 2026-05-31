-- =================================================================
-- M63: طبقة الجودة — quality_indicators · quality_evidence
-- التاريخ: 2026-05-30
-- =================================================================
-- الجداول:
--   quality_indicators — مؤشرات الجودة (قاموس مرجعي لكل مدرسة)
--   quality_evidence   — أدلة الجودة (سجل ما يُثبت المؤشر)
--
-- المبدأ:
--   المستخدم يُنجز مهمة تشغيلية (يسجّل غياباً، يُدخل زيارة مكتبة).
--   النظام يُنتج دليل جودة في الخلفية عبر trigger مستقبلاً.
--   quality_evidence.source_event_id بدون FK لأن الأدلة تأتي
--   من جداول متعددة (attendance, lrc_visits, health_visits, ...).
--
-- التبعيات:
--   ✅ schools · academic_years · user_personas
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quality_indicators'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quality_indicators موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quality_evidence'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: quality_evidence موجودة مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. quality_indicators — مؤشرات الجودة (قاموس مرجعي)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.quality_indicators (
    id                 uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- كود المؤشر — يستخدمه النظام للربط الآلي (ATT-001, LRC-003, ...)
    code               text        NOT NULL,
    name_ar            text        NOT NULL,

    domain             text        NOT NULL CHECK (domain IN (
                           'attendance',   -- الحضور والانتظام
                           'behavior',     -- السلوك
                           'academic',     -- التحصيل الأكاديمي
                           'health',       -- الصحة المدرسية
                           'lrc',          -- مصادر التعلم
                           'activity',     -- النشاط الطلابي
                           'environment'   -- البيئة المدرسية
                       )),

    responsible_role   text        NOT NULL,  -- الدور المسؤول عن قياس هذا المؤشر
    measurement_method text,                  -- طريقة القياس
    target_value       decimal,               -- القيمة المستهدفة
    is_auto_fillable   boolean     NOT NULL DEFAULT false,  -- يُملأ آلياً من النظام
    is_active          boolean     NOT NULL DEFAULT true,

    created_at         timestamptz NOT NULL DEFAULT now(),

    UNIQUE (school_id, code)
);

ALTER TABLE public.quality_indicators ENABLE ROW LEVEL SECURITY;

-- SELECT: كل موظفي المدرسة (بيانات مرجعية — مرئية للجميع)
CREATE POLICY "qi_select" ON public.quality_indicators
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

CREATE POLICY "qi_insert" ON public.quality_indicators
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_admin'
        )
    )
);

CREATE POLICY "qi_update" ON public.quality_indicators
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_admin'
        )
    )
);

CREATE INDEX idx_qi_school_domain    ON public.quality_indicators (school_id, domain);
CREATE INDEX idx_qi_auto_fillable    ON public.quality_indicators (school_id)
    WHERE is_auto_fillable = true AND is_active = true;
CREATE INDEX idx_qi_code             ON public.quality_indicators (school_id, code);

-- ════════════════════════════════════════════════════════════════
-- 2. quality_evidence — أدلة الجودة
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.quality_evidence (
    id                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id              uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    indicator_id           uuid        NOT NULL REFERENCES public.quality_indicators(id) ON DELETE RESTRICT,

    -- مصدر الدليل — UUID بدون FK صريح لأن المصدر متعدد الجداول
    -- (period_attendance, lrc_visits, health_visits, behavioral_referrals, ...)
    source_event_id        uuid,
    source_module          text        NOT NULL CHECK (source_module IN (
                               'attendance', 'lrc', 'health', 'behavior',
                               'counselor', 'hr', 'activity'
                           )),

    evidence_date          date        NOT NULL DEFAULT CURRENT_DATE,
    value                  decimal     NOT NULL,
    notes                  text,

    -- true = أُنشئ تلقائياً بـ trigger / false = أُدخل يدوياً
    auto_generated         boolean     NOT NULL DEFAULT false,

    academic_year_id       uuid        NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    recorded_by_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quality_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qe_select" ON public.quality_evidence
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_principal',
            'school_admin'
        )
    )
);

-- INSERT: منسق الجودة يُدخل يدوياً + Triggers (SECURITY DEFINER) تُدخل آلياً
CREATE POLICY "qe_insert" ON public.quality_evidence
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_admin'
        )
    )
);

-- لا UPDATE policy — أدلة الجودة أرشيفية غير قابلة للتعديل بعد الإنشاء
-- (التصحيح يكون بإدخال سجل جديد أو DELETE ثم إعادة الإدخال)

CREATE INDEX idx_qe_indicator_date ON public.quality_evidence (indicator_id, evidence_date DESC);
CREATE INDEX idx_qe_school_year    ON public.quality_evidence (school_id, academic_year_id);
CREATE INDEX idx_qe_source         ON public.quality_evidence (source_module, source_event_id)
    WHERE source_event_id IS NOT NULL;
CREATE INDEX idx_qe_auto           ON public.quality_evidence (school_id, evidence_date)
    WHERE auto_generated = true;

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rls_qi boolean;
    v_rls_qe boolean;
    v_pol_qi integer;
    v_pol_qe integer;
BEGIN
    SELECT relrowsecurity INTO v_rls_qi FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'quality_indicators';

    SELECT relrowsecurity INTO v_rls_qe FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'quality_evidence';

    IF NOT v_rls_qi THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على quality_indicators';
    END IF;
    IF NOT v_rls_qe THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على quality_evidence';
    END IF;

    SELECT COUNT(*) INTO v_pol_qi FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_indicators';

    SELECT COUNT(*) INTO v_pol_qe FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_evidence';

    IF v_pol_qi < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على quality_indicators', v_pol_qi;
    END IF;
    IF v_pol_qe < 2 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على quality_evidence — المتوقع ≥ 2', v_pol_qe;
    END IF;

    -- التحقق من UNIQUE (school_id, code) على quality_indicators
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'quality_indicators'
          AND constraint_type   = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'FAIL: quality_indicators تفتقر لـ UNIQUE (school_id, code)';
    END IF;

    RAISE NOTICE '✅ M63 اكتمل:';
    RAISE NOTICE '   ✓ quality_indicators — % سياسات RLS (SELECT للجميع، كتابة للمنسق)', v_pol_qi;
    RAISE NOTICE '   ✓ quality_evidence — % سياسات RLS (لا UPDATE — سجلات أرشيفية)', v_pol_qe;
    RAISE NOTICE '   ✓ source_event_id بدون FK مقصود — يدعم مصادر متعددة';
    RAISE NOTICE '   ✓ auto_generated يميّز الأدلة الآلية عن اليدوية';
END $$;

COMMIT;
