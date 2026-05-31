-- =================================================================
-- M62: عقود السلوك وجلسات الإرشاد
-- التاريخ: 2026-05-30
-- =================================================================
-- الجداول:
--   behavioral_contracts — عقود السلوك مع توقيعات الطالب/الولي/الوكيل
--   counselor_sessions   — جلسات الإرشاد الطلابي (فردية/جماعية)
--
-- التبعيات:
--   ✅ schools · student_profiles · academic_years
--   ✅ user_personas
--   ✅ behavioral_referrals (R02)
--   ✅ cases (core)
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'behavioral_referrals'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: behavioral_referrals غير موجودة — طبّق R02 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cases'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: cases غير موجودة';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'behavioral_contracts'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: behavioral_contracts موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'counselor_sessions'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: counselor_sessions موجودة مسبقاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. behavioral_contracts — عقود السلوك
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.behavioral_contracts (
    id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    student_id       uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- إحالة اختيارية — العقد قد يُنشأ مباشرة بدون إحالة رسمية
    referral_id      uuid        REFERENCES public.behavioral_referrals(id) ON DELETE SET NULL,
    academic_year_id uuid        NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,

    -- نص العقد
    terms            text        NOT NULL,
    is_active        boolean     NOT NULL DEFAULT true,

    -- توقيعات الأطراف الثلاثة (تاريخ التوقيع = دليل الموافقة)
    student_signed_at date,
    parent_signed_at  date,
    vp_signed_at      date,
    vp_persona_id     uuid       REFERENCES public.user_personas(id),

    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.behavioral_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bc_select" ON public.behavioral_contracts
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'student_counselor',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "bc_insert" ON public.behavioral_contracts
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
);

CREATE POLICY "bc_update" ON public.behavioral_contracts
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin',
            'school_principal'
        )
    )
);

CREATE INDEX idx_bc_student       ON public.behavioral_contracts (student_id, academic_year_id);
CREATE INDEX idx_bc_school        ON public.behavioral_contracts (school_id);
CREATE INDEX idx_bc_active        ON public.behavioral_contracts (school_id, is_active)
    WHERE is_active = true;

CREATE TRIGGER trg_bc_updated_at
    BEFORE UPDATE ON public.behavioral_contracts
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- 2. counselor_sessions — جلسات الإرشاد
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.counselor_sessions (
    id                   uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    student_id           uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- الحالة اختيارية — الجلسة قد تكون استباقية بدون حالة مفتوحة
    case_id              uuid        REFERENCES public.cases(id) ON DELETE SET NULL,
    counselor_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    session_date         date        NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes     int         CHECK (duration_minutes > 0 AND duration_minutes <= 480),

    session_type         text        NOT NULL CHECK (session_type IN (
                             'individual',  -- جلسة فردية
                             'group',       -- جلسة جماعية
                             'parent',      -- جلسة مع ولي الأمر
                             'follow_up'    -- متابعة
                         )),

    notes                text,
    outcome              text,
    next_session_date    date,

    created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.counselor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select" ON public.counselor_sessions
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

CREATE POLICY "cs_insert" ON public.counselor_sessions
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
            'school_admin'
        )
    )
);

CREATE POLICY "cs_update" ON public.counselor_sessions
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor',
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
            'school_admin'
        )
    )
);

CREATE INDEX idx_cs_student    ON public.counselor_sessions (student_id, session_date DESC);
CREATE INDEX idx_cs_school     ON public.counselor_sessions (school_id, session_date DESC);
CREATE INDEX idx_cs_counselor  ON public.counselor_sessions (counselor_persona_id);
CREATE INDEX idx_cs_case       ON public.counselor_sessions (case_id)
    WHERE case_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_rls_bc boolean;
    v_rls_cs boolean;
    v_pol_bc integer;
    v_pol_cs integer;
BEGIN
    SELECT relrowsecurity INTO v_rls_bc FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'behavioral_contracts';

    SELECT relrowsecurity INTO v_rls_cs FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'counselor_sessions';

    IF NOT v_rls_bc THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على behavioral_contracts';
    END IF;
    IF NOT v_rls_cs THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على counselor_sessions';
    END IF;

    SELECT COUNT(*) INTO v_pol_bc FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'behavioral_contracts';

    SELECT COUNT(*) INTO v_pol_cs FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'counselor_sessions';

    IF v_pol_bc < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على behavioral_contracts', v_pol_bc;
    END IF;
    IF v_pol_cs < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على counselor_sessions', v_pol_cs;
    END IF;

    RAISE NOTICE '✅ M62 اكتمل:';
    RAISE NOTICE '   ✓ behavioral_contracts — % سياسات RLS', v_pol_bc;
    RAISE NOTICE '   ✓ counselor_sessions — % سياسات RLS', v_pol_cs;
    RAISE NOTICE '   ✓ trigger trg_bc_updated_at على behavioral_contracts';
END $$;

COMMIT;
