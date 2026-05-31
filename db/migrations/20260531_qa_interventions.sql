-- =================================================================
-- M69: التدخلات ومؤشرات الخطر — QA Layer
-- التاريخ: 2026-05-31
-- =================================================================
-- الجداول:
--   interventions       — تدخلات الطالب (DROP + REBUILD)
--   student_risk_flags  — مؤشرات خطر الطالب (DROP + REBUILD)
--
-- ملاحظة:
--   كلاهما موجود في DB (R07 أضاف school_id NOT NULL)
--   لكن بدون حقول كافية — نُعيد بناءهما بالنمط الذهبي.
--
-- التبعيات:
--   ✅ schools · student_profiles · user_personas
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

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_profiles غير موجودة';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ────────────────────────────────────────────────────────────────
-- حذف الجداول القديمة
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.interventions        CASCADE;
DROP TABLE IF EXISTS public.student_risk_flags   CASCADE;

-- ════════════════════════════════════════════════════════════════
-- 1. interventions — تدخلات دعم الطالب
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.interventions (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    student_id               uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- الموظف المسؤول عن التدخل (مرشد / وكيل)
    assigned_to_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    -- تفاصيل التدخل
    type                     text        NOT NULL CHECK (type IN (
                                 'academic',      -- دعم أكاديمي
                                 'behavioral',    -- دعم سلوكي
                                 'social',        -- دعم اجتماعي
                                 'psychological', -- دعم نفسي
                                 'attendance',    -- تدخل غياب
                                 'other'
                             )),
    description              text,
    start_date               date        NOT NULL DEFAULT CURRENT_DATE,
    end_date                 date,           -- NULL = لا تاريخ انتهاء محدد

    status                   text        NOT NULL DEFAULT 'active' CHECK (status IN (
                                 'active',    -- جارٍ
                                 'completed', -- اكتمل
                                 'cancelled'  -- ألغي
                             )),
    outcome                  text,           -- نتيجة التدخل عند الإغلاق

    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_int_updated_at
    BEFORE UPDATE ON public.interventions
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_int_school      ON public.interventions (school_id);
CREATE INDEX idx_int_student     ON public.interventions (student_id, status);
CREATE INDEX idx_int_assigned    ON public.interventions (assigned_to_persona_id);
CREATE INDEX idx_int_active      ON public.interventions (school_id, status)
    WHERE status = 'active';

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- SELECT: المرشد + الوكيل + الإداريون
CREATE POLICY "int_select" ON public.interventions
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

-- INSERT: المرشد + الوكيل + الإداريون
CREATE POLICY "int_insert" ON public.interventions
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- UPDATE: تحديث الحالة والنتيجة
CREATE POLICY "int_update" ON public.interventions
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- 2. student_risk_flags — مؤشرات الخطر
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.student_risk_flags (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    student_id               uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- مستوى الخطر وعوامله
    risk_level               text        NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
    risk_factors             text[]      NOT NULL DEFAULT '{}',

    -- توقيت الاكتشاف والحل
    detected_at              timestamptz NOT NULL DEFAULT now(),
    resolved_at              timestamptz,
    resolved_by_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    notes                    text,

    -- طالب واحد لا يمكن أن يملك أكثر من مؤشر خطر نشط في نفس الوقت
    CONSTRAINT srf_active_unique UNIQUE (student_id, resolved_at)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_srf_school      ON public.student_risk_flags (school_id, risk_level);
CREATE INDEX idx_srf_student     ON public.student_risk_flags (student_id);
CREATE INDEX idx_srf_unresolved  ON public.student_risk_flags (school_id, risk_level)
    WHERE resolved_at IS NULL;
CREATE INDEX idx_srf_high        ON public.student_risk_flags (school_id)
    WHERE risk_level = 'high' AND resolved_at IS NULL;

ALTER TABLE public.student_risk_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srf_select" ON public.student_risk_flags
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "srf_insert" ON public.student_risk_flags
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- UPDATE: لتحديث resolved_at وإغلاق المؤشر
CREATE POLICY "srf_update" ON public.student_risk_flags
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_table text;
    v_rls   boolean;
    v_pol   integer;
BEGIN
    FOREACH v_table IN ARRAY ARRAY['interventions', 'student_risk_flags']
    LOOP
        SELECT relrowsecurity INTO v_rls FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relname = v_table;

        IF NOT v_rls THEN
            RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على %', v_table;
        END IF;

        SELECT COUNT(*) INTO v_pol FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table;

        IF v_pol < 3 THEN
            RAISE EXCEPTION 'FAIL: % سياسات على % (المتوقع ≥ 3)', v_pol, v_table;
        END IF;

        RAISE NOTICE '✓ % — school_id NOT NULL | RLS + % سياسات', v_table, v_pol;
    END LOOP;

    -- التحقق من وجود risk_factors text[]
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_risk_flags'
      AND column_name = 'risk_factors';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: risk_factors غير موجود في student_risk_flags';
    END IF;

    -- التحقق من intervention type CHECK
    PERFORM 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%interventions%';

    RAISE NOTICE '';
    RAISE NOTICE '✅ M69 اكتمل: interventions + student_risk_flags';
    RAISE NOTICE '   ✓ school_id NOT NULL على الجدولين';
    RAISE NOTICE '   ✓ risk_factors text[] على student_risk_flags';
    RAISE NOTICE '   ✓ intervention.type CHECK مع 6 أنواع';
END $$;

COMMIT;
