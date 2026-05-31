-- =================================================================
-- M71: أدوات الملاحظة الصفية — qa_rubrics
-- التاريخ: 2026-05-31
-- =================================================================
-- الجدول:
--   qa_rubrics — قوالب الملاحظة الصفية (معايير + نطاقات التقييم)
--
-- البنية:
--   title        — اسم الأداة (مثال: "استمارة الملاحظة الصفية — 2026")
--   is_active    — يُستخدم للفلترة: نموذج واحد نشط في كل وقت
--   domains      — JSONB: مصفوفة نطاقات كل منها { code, name, weight, criteria[] }
--
-- مثال على domains:
--   [
--     { "code": "D1", "name": "إدارة الفصل", "weight": 0.25,
--       "criteria": [
--         { "code": "C1", "label": "التنظيم والترتيب", "max_score": 4 }
--       ]
--     }
--   ]
--
-- التبعيات:
--   ✅ schools · user_personas
--   ✅ fn_set_updated_at() · get_my_school_id()
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'get_my_school_id'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- حذف إن وُجد (idempotent)
DROP TABLE IF EXISTS public.qa_rubrics CASCADE;

-- ════════════════════════════════════════════════════════════════
-- qa_rubrics — أداة الملاحظة الصفية
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.qa_rubrics (
    id                    uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- معلومات الأداة
    title                 text        NOT NULL,
    description           text,
    is_active             boolean     NOT NULL DEFAULT false,

    -- النطاقات والمعايير — مصفوفة JSONB مرنة
    -- البنية: [{ code, name, weight, criteria: [{ code, label, max_score }] }]
    domains               jsonb       NOT NULL DEFAULT '[]',

    -- معلومات الإنشاء
    created_by_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_qar_updated_at
    BEFORE UPDATE ON public.qa_rubrics
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- قيد: لا يوجد أكثر من أداة نشطة واحدة لكل مدرسة
CREATE UNIQUE INDEX idx_qar_one_active
    ON public.qa_rubrics (school_id)
    WHERE is_active = true;

CREATE INDEX idx_qar_school ON public.qa_rubrics (school_id, is_active);

-- فهرس GIN للبحث داخل domains JSONB
CREATE INDEX idx_qar_domains ON public.qa_rubrics USING GIN (domains);

ALTER TABLE public.qa_rubrics ENABLE ROW LEVEL SECURITY;

-- SELECT: منسق الجودة + الإداريون + المدير
CREATE POLICY "qar_select" ON public.qa_rubrics
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'quality_coordinator',
            'school_principal',
            'academic_vp',
            'school_admin'
        )
    )
);

-- INSERT: منسق الجودة + الإداريون فقط
CREATE POLICY "qar_insert" ON public.qa_rubrics
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

-- UPDATE: منسق الجودة + الإداريون فقط
CREATE POLICY "qar_update" ON public.qa_rubrics
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

-- ════════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_rls boolean;
    v_pol integer;
BEGIN
    SELECT relrowsecurity INTO v_rls FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'qa_rubrics';

    IF NOT v_rls THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على qa_rubrics';
    END IF;

    SELECT COUNT(*) INTO v_pol FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qa_rubrics';

    IF v_pol < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على qa_rubrics (المتوقع ≥ 3)', v_pol;
    END IF;

    -- التحقق من school_id NOT NULL
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qa_rubrics'
      AND column_name = 'school_id' AND is_nullable = 'NO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: school_id يقبل NULL في qa_rubrics';
    END IF;

    -- التحقق من الفهرس الفريد للنشط
    PERFORM 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'qa_rubrics'
      AND indexname = 'idx_qar_one_active';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: فهرس idx_qar_one_active غير موجود';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ M71 اكتمل: qa_rubrics';
    RAISE NOTICE '   ✓ school_id NOT NULL';
    RAISE NOTICE '   ✓ RLS + % سياسات', v_pol;
    RAISE NOTICE '   ✓ UNIQUE INDEX: أداة واحدة نشطة لكل مدرسة';
    RAISE NOTICE '   ✓ domains JSONB + GIN index';
END $$;

COMMIT;
