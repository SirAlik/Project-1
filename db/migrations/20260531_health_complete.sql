-- =================================================================
-- M68: الصحة المدرسية — بناء كامل
-- التاريخ: 2026-05-31
-- =================================================================
-- العمليات:
--   health_visits    — إضافة حقول جوهرية ناقصة (ALTER, لا DROP)
--   health_referrals — DROP + REBUILD (بنية مختلفة عن الأصلية)
--   health_supplies  — CREATE (جديد)
--   canteen_checks   — CREATE (جديد)
--   hygiene_logs     — CREATE (جديد)
--
-- التبعيات:
--   ✅ schools · student_profiles · classes · user_personas
--   ✅ health_visits (موجود من قبل + R07 أضاف school_id NOT NULL)
--   ✅ get_my_school_id() · fn_set_updated_at()
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'health_visits'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: health_visits غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'get_my_school_id'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة — طبّق R00 أولاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- حذف الجداول الجديدة إن وُجدت (idempotent)
DROP TABLE IF EXISTS public.hygiene_logs    CASCADE;
DROP TABLE IF EXISTS public.canteen_checks  CASCADE;
DROP TABLE IF EXISTS public.health_supplies CASCADE;

-- ════════════════════════════════════════════════════════════════
-- 1. health_visits — إضافة الحقول الجوهرية الناقصة
-- ════════════════════════════════════════════════════════════════
-- نستخدم ADD COLUMN IF NOT EXISTS لأن الجدول موجود وله بيانات محتملة

ALTER TABLE public.health_visits
    ADD COLUMN IF NOT EXISTS triage_level             text
        CHECK (triage_level IN ('minor', 'moderate', 'emergency')),
    ADD COLUMN IF NOT EXISTS needs_parent_notification boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS parent_notified_at        timestamptz,
    ADD COLUMN IF NOT EXISTS needs_followup            boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS followup_date             date,
    ADD COLUMN IF NOT EXISTS needs_referral            boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS referred_to               text,
    ADD COLUMN IF NOT EXISTS created_by_persona_id     uuid
        REFERENCES public.user_personas(id) ON DELETE SET NULL;

-- فهرس على حالات الطوارئ لإشعارات سريعة
CREATE INDEX IF NOT EXISTS idx_hv_emergency
    ON public.health_visits (school_id, triage_level)
    WHERE triage_level = 'emergency';

CREATE INDEX IF NOT EXISTS idx_hv_needs_notif
    ON public.health_visits (school_id, needs_parent_notification)
    WHERE needs_parent_notification = true AND parent_notified_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. health_referrals — DROP + REBUILD
-- ════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.health_referrals CASCADE;

CREATE TABLE public.health_referrals (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- الزيارة الأصلية التي أفضت للإحالة
    visit_id                 uuid        NOT NULL REFERENCES public.health_visits(id) ON DELETE RESTRICT,
    student_id               uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- وجهة الإحالة وسببها
    destination              text        NOT NULL CHECK (destination IN (
                                 'hospital',    -- مستشفى
                                 'clinic',      -- عيادة خارجية
                                 'home',        -- المنزل (إعادة للولي)
                                 'parent',      -- ولي الأمر يستلمه في المدرسة
                                 'other'        -- أخرى
                             )),
    reason                   text        NOT NULL,

    -- إشعار ولي الأمر
    parent_notified          boolean     NOT NULL DEFAULT false,
    notified_at              timestamptz,

    notes                    text,
    recorded_by_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_school_date  ON public.health_referrals (school_id, created_at DESC);
CREATE INDEX idx_hr_student      ON public.health_referrals (student_id);
CREATE INDEX idx_hr_visit        ON public.health_referrals (visit_id);
CREATE INDEX idx_hr_unnotified   ON public.health_referrals (school_id)
    WHERE parent_notified = false;

ALTER TABLE public.health_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_select" ON public.health_referrals
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'student_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "hr_insert" ON public.health_referrals
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
);

CREATE POLICY "hr_update" ON public.health_referrals
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- 3. health_supplies — مستلزمات العيادة (جديد)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.health_supplies (
    id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    item_name   text        NOT NULL,
    category    text        NOT NULL CHECK (category IN (
                    'first_aid',   -- إسعافات أولية
                    'hygiene',     -- مستلزمات النظافة
                    'equipment',   -- معدات طبية
                    'medication',  -- أدوية مرخصة
                    'other'
                )),

    quantity    integer     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit        text        NOT NULL,          -- قطعة / علبة / ملليلتر...
    condition   text        NOT NULL DEFAULT 'good' CHECK (condition IN (
                    'good',     -- سليم
                    'damaged',  -- تالف
                    'expired'   -- منتهي الصلاحية
                )),

    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_hs_updated_at
    BEFORE UPDATE ON public.health_supplies
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_hs_school     ON public.health_supplies (school_id);
CREATE INDEX idx_hs_category   ON public.health_supplies (school_id, category);
CREATE INDEX idx_hs_low_stock  ON public.health_supplies (school_id, quantity)
    WHERE quantity < 5;

ALTER TABLE public.health_supplies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hs_select" ON public.health_supplies
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "hs_insert" ON public.health_supplies
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
);

CREATE POLICY "hs_update" ON public.health_supplies
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
);

-- ════════════════════════════════════════════════════════════════
-- 4. canteen_checks — فحوصات المقصف (جديد)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.canteen_checks (
    id                    uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    check_date            date        NOT NULL DEFAULT CURRENT_DATE,
    hygiene_score         integer     NOT NULL CHECK (hygiene_score BETWEEN 1 AND 5),
    food_score            integer     NOT NULL CHECK (food_score BETWEEN 1 AND 5),
    notes                 text,

    inspector_persona_id  uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT cc_one_per_day UNIQUE (school_id, check_date)
);

CREATE INDEX idx_cc_school_date  ON public.canteen_checks (school_id, check_date DESC);

ALTER TABLE public.canteen_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select" ON public.canteen_checks
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "cc_insert" ON public.canteen_checks
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
);

CREATE POLICY "cc_update" ON public.canteen_checks
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
);

-- ════════════════════════════════════════════════════════════════
-- 5. hygiene_logs — سجلات النظافة الشخصية (جديد)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.hygiene_logs (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    student_id               uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    class_id                 uuid        NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,

    check_date               date        NOT NULL DEFAULT CURRENT_DATE,

    -- بنود الفحص
    hair_clean               boolean     NOT NULL DEFAULT true,
    nails_trimmed            boolean     NOT NULL DEFAULT true,
    uniform_clean            boolean     NOT NULL DEFAULT true,

    notes                    text,
    checked_by_persona_id    uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT hl_student_date_unique UNIQUE (student_id, check_date)
);

CREATE INDEX idx_hl_school_date  ON public.hygiene_logs (school_id, check_date DESC);
CREATE INDEX idx_hl_student      ON public.hygiene_logs (student_id);
CREATE INDEX idx_hl_class        ON public.hygiene_logs (class_id, check_date DESC);

ALTER TABLE public.hygiene_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hl_select" ON public.hygiene_logs
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'student_affairs_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "hl_insert" ON public.hygiene_logs
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
    )
);

CREATE POLICY "hl_update" ON public.hygiene_logs
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
        )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'health_coordinator',
            'school_admin'
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
    v_col   text;
BEGIN
    -- التحقق من الأعمدة الجديدة في health_visits
    SELECT column_name INTO v_col FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'health_visits'
      AND column_name = 'triage_level';

    IF v_col IS NULL THEN
        RAISE EXCEPTION 'FAIL: triage_level لم يُضَف إلى health_visits';
    END IF;

    SELECT column_name INTO v_col FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'health_visits'
      AND column_name = 'needs_parent_notification';

    IF v_col IS NULL THEN
        RAISE EXCEPTION 'FAIL: needs_parent_notification لم يُضَف إلى health_visits';
    END IF;

    RAISE NOTICE '✓ health_visits — أعمدة جديدة: triage_level + needs_parent_notification + ...';

    -- التحقق من الجداول الجديدة
    FOREACH v_table IN ARRAY ARRAY['health_referrals','health_supplies','canteen_checks','hygiene_logs']
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

        RAISE NOTICE '✓ % — RLS + % سياسات', v_table, v_pol;
    END LOOP;

    -- التحقق من school_id NOT NULL
    FOREACH v_table IN ARRAY ARRAY['health_referrals','health_supplies','canteen_checks','hygiene_logs']
    LOOP
        PERFORM 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = v_table
          AND column_name = 'school_id' AND is_nullable = 'NO';
        IF NOT FOUND THEN
            RAISE EXCEPTION 'FAIL: school_id في % يقبل NULL', v_table;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ M68 اكتمل: health_visits (توسعة) + health_referrals + health_supplies + canteen_checks + hygiene_logs';
END $$;

COMMIT;
