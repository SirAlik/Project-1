-- =================================================================
-- M65 + M66: مغادرة الفصل وأصول الطالب
-- التاريخ: 2026-05-31
-- =================================================================
-- الجداول:
--   classroom_exits  — تسجيل خروج الطالب أثناء الحصة وعودته
--   student_assets   — الأصول المُسلَّمة للطالب (كتب / أجهزة / معدات)
--
-- التبعيات:
--   ✅ schools · student_profiles · classes
--   ✅ timetable_slots · user_personas
--   ✅ fn_set_updated_at() (من student_daily_attendance migration)
--   ✅ get_my_school_id() (R00)
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'classroom_exits'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: classroom_exits موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_assets'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_assets موجودة مسبقاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'timetable_slots'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: timetable_slots غير موجودة';
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

-- ════════════════════════════════════════════════════════════════
-- M65: classroom_exits — مغادرة الطالب أثناء الحصة
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.classroom_exits (
    id                   uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id            uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- الطالب والفصل
    student_id           uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,
    class_id             uuid        NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,

    -- الحصة التي حدثت فيها المغادرة (اختياري — قد يكون الخروج بين الحصص)
    timetable_slot_id    uuid        REFERENCES public.timetable_slots(id) ON DELETE SET NULL,

    -- المعلم الذي أذن بالخروج
    teacher_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    -- تاريخ المغادرة ونوعها
    exit_date            date        NOT NULL DEFAULT CURRENT_DATE,
    exit_type            text        NOT NULL CHECK (exit_type IN (
                             'restroom',   -- دورة المياه
                             'clinic',     -- العيادة الصحية
                             'admin',      -- الإدارة
                             'other'       -- أخرى
                         )),

    -- وقت الخروج والعودة
    exit_time            timestamptz NOT NULL DEFAULT now(),
    return_time          timestamptz,    -- NULL = لم يعد بعد

    -- مدة الغياب بالدقائق — تُحسب آلياً من عمودَي exit_time و return_time
    duration_minutes     integer     GENERATED ALWAYS AS (
                             CASE
                                 WHEN return_time IS NOT NULL
                                 THEN EXTRACT(EPOCH FROM (return_time - exit_time))::integer / 60
                                 ELSE NULL
                             END
                         ) STORED,

    note                 text,
    created_at           timestamptz NOT NULL DEFAULT now(),

    -- منع تسجيل خروجين متزامنين لنفس الطالب في نفس اليوم والحصة
    CONSTRAINT ce_no_duplicate_active UNIQUE (student_id, timetable_slot_id)
        DEFERRABLE INITIALLY DEFERRED
);

-- ──────────────────────────────────────────────────────
-- فهارس الأداء
-- ──────────────────────────────────────────────────────
CREATE INDEX idx_ce_school_date    ON public.classroom_exits (school_id, exit_date DESC);
CREATE INDEX idx_ce_student        ON public.classroom_exits (student_id, exit_date DESC);
CREATE INDEX idx_ce_class          ON public.classroom_exits (class_id, exit_date DESC);
CREATE INDEX idx_ce_teacher        ON public.classroom_exits (teacher_persona_id);
CREATE INDEX idx_ce_still_out      ON public.classroom_exits (school_id, exit_date)
    WHERE return_time IS NULL;

-- ──────────────────────────────────────────────────────
-- RLS — النمط الذهبي
-- ──────────────────────────────────────────────────────
ALTER TABLE public.classroom_exits ENABLE ROW LEVEL SECURITY;

-- SELECT: المعلم يرى سجلات فصله | الإداريون يرون كل مدرستهم
CREATE POLICY "ce_select" ON public.classroom_exits
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher',
            'school_affairs_vp',
            'student_affairs_vp',
            'school_principal',
            'school_admin',
            'health_coordinator'
        )
    )
);

-- INSERT: المعلم يُسجّل الخروج | الإداريون أيضاً
CREATE POLICY "ce_insert" ON public.classroom_exits
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher',
            'school_affairs_vp',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- UPDATE: لتسجيل return_time فقط
CREATE POLICY "ce_update" ON public.classroom_exits
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher',
            'school_affairs_vp',
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
            'teacher',
            'school_affairs_vp',
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- لا DELETE — السجل أرشيفي لا يُحذف

-- ════════════════════════════════════════════════════════════════
-- M66: student_assets — الأصول المُسلَّمة للطالب
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.student_assets (
    id                     uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id              uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    student_id             uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    -- نوع الأصل والوصف
    asset_type             text        NOT NULL CHECK (asset_type IN (
                               'book',       -- كتاب مدرسي
                               'device',     -- جهاز إلكتروني (آيباد، لابتوب)
                               'equipment',  -- معدات ومستلزمات
                               'other'       -- أخرى
                           )),
    asset_name             text        NOT NULL,
    asset_identifier       text,               -- رقم تسلسلي / ISBN / رقم جرد

    -- التسليم والاستلام
    handover_date          date        NOT NULL DEFAULT CURRENT_DATE,
    return_date            date,               -- NULL = لم يُستلم بعد

    status                 text        NOT NULL DEFAULT 'assigned' CHECK (status IN (
                               'assigned',   -- بحوزة الطالب
                               'returned',   -- أُعيد سليماً
                               'lost',       -- مفقود
                               'damaged'     -- تالف
                           )),

    -- الموظف المسؤول عن التسليم / التسجيل
    recorded_by_persona_id uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    notes                  text,

    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now(),

    -- قيد: الأصل ذو المعرِّف يجب أن يكون فريداً في نفس المدرسة
    CONSTRAINT sa_identifier_unique UNIQUE (school_id, asset_identifier)
        DEFERRABLE INITIALLY DEFERRED
);

-- ──────────────────────────────────────────────────────
-- Trigger: تحديث updated_at
-- ──────────────────────────────────────────────────────
CREATE TRIGGER trg_sa_updated_at
    BEFORE UPDATE ON public.student_assets
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ──────────────────────────────────────────────────────
-- فهارس الأداء
-- ──────────────────────────────────────────────────────
CREATE INDEX idx_sa_school        ON public.student_assets (school_id);
CREATE INDEX idx_sa_student       ON public.student_assets (student_id, status);
CREATE INDEX idx_sa_status        ON public.student_assets (school_id, status);
CREATE INDEX idx_sa_active        ON public.student_assets (school_id, student_id)
    WHERE status = 'assigned';
CREATE INDEX idx_sa_identifier    ON public.student_assets (school_id, asset_identifier)
    WHERE asset_identifier IS NOT NULL;

-- ──────────────────────────────────────────────────────
-- RLS — النمط الذهبي
-- ──────────────────────────────────────────────────────
ALTER TABLE public.student_assets ENABLE ROW LEVEL SECURITY;

-- SELECT: شؤون الطلاب + إداريون + سكرتير
CREATE POLICY "sa_select" ON public.student_assets
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_affairs_vp',
            'school_principal',
            'school_admin',
            'school_secretary'
        )
    )
);

-- INSERT: وكيل شؤون الطلاب + school_admin
CREATE POLICY "sa_insert" ON public.student_assets
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- UPDATE: لتحديث الحالة (استلام / فقدان / تلف)
CREATE POLICY "sa_update" ON public.student_assets
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
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
            'student_affairs_vp',
            'school_admin'
        )
    )
);

-- لا DELETE — السجل أرشيفي

-- ════════════════════════════════════════════════════════════════
-- التحقق النهائي
-- ════════════════════════════════════════════════════════════════
DO $$
DECLARE
    v_rls_ce   boolean;
    v_rls_sa   boolean;
    v_pol_ce   integer;
    v_pol_sa   integer;
    v_gen_col  text;
BEGIN
    -- التحقق من RLS
    SELECT relrowsecurity INTO v_rls_ce FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'classroom_exits';

    SELECT relrowsecurity INTO v_rls_sa FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = 'student_assets';

    IF NOT v_rls_ce THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على classroom_exits';
    END IF;
    IF NOT v_rls_sa THEN
        RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على student_assets';
    END IF;

    -- التحقق من عدد السياسات
    SELECT COUNT(*) INTO v_pol_ce FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'classroom_exits';

    SELECT COUNT(*) INTO v_pol_sa FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_assets';

    IF v_pol_ce < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على classroom_exits (المتوقع ≥ 3)', v_pol_ce;
    END IF;
    IF v_pol_sa < 3 THEN
        RAISE EXCEPTION 'FAIL: % سياسات على student_assets (المتوقع ≥ 3)', v_pol_sa;
    END IF;

    -- التحقق من العمود المحسوب duration_minutes
    SELECT column_name INTO v_gen_col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'classroom_exits'
      AND column_name  = 'duration_minutes'
      AND is_generated = 'ALWAYS';

    IF v_gen_col IS NULL THEN
        RAISE EXCEPTION 'FAIL: duration_minutes ليس عموداً محسوباً (GENERATED ALWAYS)';
    END IF;

    -- التحقق من school_id NOT NULL في كلا الجدولين
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'classroom_exits'
      AND column_name = 'school_id' AND is_nullable = 'NO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: school_id في classroom_exits يقبل NULL';
    END IF;

    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_assets'
      AND column_name = 'school_id' AND is_nullable = 'NO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: school_id في student_assets يقبل NULL';
    END IF;

    RAISE NOTICE '✅ M65 + M66 اكتملا:';
    RAISE NOTICE '   ✓ classroom_exits — school_id NOT NULL | duration_minutes GENERATED | % سياسات RLS', v_pol_ce;
    RAISE NOTICE '   ✓ student_assets  — school_id NOT NULL | updated_at trigger | % سياسات RLS', v_pol_sa;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════
-- استعلامات التحقق اليدوي (للتشغيل في SQL Editor بعد COMMIT)
-- ════════════════════════════════════════════════════════════════
--
-- هل duration_minutes عمود محسوب؟
-- SELECT column_name, is_generated, generation_expression
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'classroom_exits';
--
-- هل RLS مفعَّل على الجدولين؟
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE relname IN ('classroom_exits', 'student_assets');
-- -- يجب: true, true
--
-- السياسات:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('classroom_exits', 'student_assets')
-- ORDER BY tablename, cmd;
