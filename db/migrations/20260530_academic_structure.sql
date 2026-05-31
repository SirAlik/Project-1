-- =================================================================
-- M59: الهيكل الأكاديمي — terms · school_stages · periods
-- التاريخ: 2026-05-30
-- =================================================================
-- الجداول الجديدة:
--   terms         — الفصول الدراسية (2 أو 3 فصول مرنة)
--   school_stages — المراحل الدراسية (ابتدائي/متوسط/ثانوي)
--   periods       — الحصص مربوطة بالمرحلة لدعم أوقات مختلفة
--
-- الجداول المُعدَّلة:
--   timetable_slots        — DROP term/period INT → ADD term_id/period_id NOT NULL FK
--   period_attendance      — DROP period_number INT → ADD period_id/term_id NOT NULL FK
--   student_daily_attendance — ADD term_id NOT NULL FK
--   classes                — ADD stage_id NOT NULL FK
--
-- التبعيات:
--   ✅ schools · academic_years · classes (R12)
--   ✅ timetable_slots (20260121_setup_production.sql)
--   ✅ period_attendance (20260528_period_attendance.sql)
--   ✅ student_daily_attendance (20260528_student_daily_attendance.sql)
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'academic_years'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: academic_years غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'timetable_slots'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: timetable_slots غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'period_attendance'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: period_attendance غير موجودة';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'terms'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: terms موجودة مسبقاً — تحقق من التطبيق المسبق';
    END IF;

    RAISE NOTICE 'Preflight ✓ — جميع التبعيات موجودة، terms غير موجودة بعد';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. school_stages — المراحل الدراسية
--    يجب أن يُنشأ أولاً لأن periods يعتمد عليه
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.school_stages (
    id          uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    name        text        NOT NULL,
    code        text        NOT NULL CHECK (code IN ('elementary', 'middle', 'high')),
    grade_from  int         NOT NULL CHECK (grade_from >= 1),
    grade_to    int         NOT NULL CHECK (grade_to >= grade_from),
    created_at  timestamptz NOT NULL DEFAULT now(),

    UNIQUE (school_id, code)
);

ALTER TABLE public.school_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_stages_select" ON public.school_stages
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

CREATE POLICY "school_stages_insert" ON public.school_stages
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

CREATE POLICY "school_stages_update" ON public.school_stages
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

CREATE INDEX idx_school_stages_school ON public.school_stages (school_id);

-- ════════════════════════════════════════════════════════════════
-- 2. terms — الفصول الدراسية
--    المرونة: أنشئ 2 أو 3 سجلات لكل academic_year
--    لا terms_count على academic_years — الجدول نفسه هو العداد
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.terms (
    id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    academic_year_id uuid        NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
    number           int         NOT NULL CHECK (number BETWEEN 1 AND 3),
    name             text        NOT NULL,
    start_date       date,
    end_date         date,
    is_active        boolean     NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),

    UNIQUE (school_id, academic_year_id, number)
);

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terms_select" ON public.terms
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

CREATE POLICY "terms_insert" ON public.terms
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'school_principal')
    )
);

CREATE POLICY "terms_update" ON public.terms
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'school_principal')
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'school_principal')
    )
);

CREATE INDEX idx_terms_school_year ON public.terms (school_id, academic_year_id);
CREATE INDEX idx_terms_active      ON public.terms (school_id) WHERE is_active = true;

-- ════════════════════════════════════════════════════════════════
-- 3. periods — الحصص الدراسية مربوطة بالمرحلة
--    مبدأ التصميم: كل مرحلة (school_stage) تملك جدول حصصها المستقل.
--    الحصة الثالثة للابتدائي (9:00) ≠ الحصة الثالثة للمتوسط (9:15).
--    school_id مكرَّر للـ RLS فقط (بدلاً من JOIN عند كل استعلام).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.periods (
    id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    school_stage_id  uuid        NOT NULL REFERENCES public.school_stages(id) ON DELETE RESTRICT,
    number           int         NOT NULL CHECK (number BETWEEN 1 AND 10),
    label            text        NOT NULL,
    start_time       time,
    end_time         time,
    created_at       timestamptz NOT NULL DEFAULT now(),

    -- كل مرحلة تملك حصصها المرقّمة بشكل مستقل
    UNIQUE (school_stage_id, number)
);

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periods_select" ON public.periods
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR school_id = public.get_my_school_id()
);

CREATE POLICY "periods_insert" ON public.periods
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'school_admin'
    )
);

CREATE POLICY "periods_update" ON public.periods
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

CREATE INDEX idx_periods_stage  ON public.periods (school_stage_id);
CREATE INDEX idx_periods_school ON public.periods (school_id);

-- ════════════════════════════════════════════════════════════════
-- 4. timetable_slots — استبدال term/period INT بـ UUID FK
--    DROP COLUMN يُزيل الـ UNIQUE constraints القديمة تلقائياً في PostgreSQL
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.timetable_slots
    DROP COLUMN IF EXISTS term,
    DROP COLUMN IF EXISTS period;

ALTER TABLE public.timetable_slots
    ADD COLUMN term_id   uuid NOT NULL REFERENCES public.terms(id)   ON DELETE RESTRICT,
    ADD COLUMN period_id uuid NOT NULL REFERENCES public.periods(id)  ON DELETE RESTRICT;

ALTER TABLE public.timetable_slots
    ADD CONSTRAINT ts_class_day_period_year_term_key
        UNIQUE (class_id, day, period_id, academic_year_id, term_id),
    ADD CONSTRAINT ts_teacher_day_period_year_term_key
        UNIQUE (teacher_id, day, period_id, academic_year_id, term_id);

CREATE INDEX idx_timetable_term_id   ON public.timetable_slots (term_id);
CREATE INDEX idx_timetable_period_id ON public.timetable_slots (period_id);

-- ════════════════════════════════════════════════════════════════
-- 5. period_attendance — استبدال period_number INT بـ period_id/term_id
--    DROP COLUMN يُزيل UNIQUE constraint والفهرس idx_pa_class_date_period تلقائياً
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.period_attendance
    DROP COLUMN IF EXISTS period_number;

ALTER TABLE public.period_attendance
    ADD COLUMN term_id   uuid NOT NULL REFERENCES public.terms(id)   ON DELETE RESTRICT,
    ADD COLUMN period_id uuid NOT NULL REFERENCES public.periods(id)  ON DELETE RESTRICT;

ALTER TABLE public.period_attendance
    ADD CONSTRAINT pa_student_date_period_school_key
        UNIQUE (student_id, period_date, period_id, school_id);

CREATE INDEX idx_pa_term_id   ON public.period_attendance (term_id);
CREATE INDEX idx_pa_period_id ON public.period_attendance (period_id, period_date DESC);

-- ════════════════════════════════════════════════════════════════
-- 6. student_daily_attendance — إضافة term_id
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.student_daily_attendance
    ADD COLUMN term_id uuid NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT;

CREATE INDEX idx_sda_term_id ON public.student_daily_attendance (term_id);

-- ════════════════════════════════════════════════════════════════
-- 7. classes — إضافة stage_id
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.classes
    ADD COLUMN stage_id uuid NOT NULL REFERENCES public.school_stages(id) ON DELETE RESTRICT;

CREATE INDEX idx_classes_stage_id ON public.classes (stage_id);

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_count   integer;
    v_col     text;
BEGIN
    -- 1. الجداول الثلاثة الجديدة موجودة مع RLS
    SELECT COUNT(*) INTO v_count
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('terms', 'school_stages', 'periods')
      AND relrowsecurity = true;

    IF v_count <> 3 THEN
        RAISE EXCEPTION
            'FAIL: % من الجداول الثلاثة موجودة مع RLS — المتوقع 3', v_count;
    END IF;

    -- 2. timetable_slots لا يحتوي على term/period القديمة
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'timetable_slots'
          AND column_name IN ('term', 'period')
    ) THEN
        RAISE EXCEPTION
            'FAIL: timetable_slots لا تزال تحتوي على أعمدة term/period الصحيحة القديمة';
    END IF;

    -- 3. period_attendance لا يحتوي على period_number القديم
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'period_attendance'
          AND column_name = 'period_number'
    ) THEN
        RAISE EXCEPTION
            'FAIL: period_attendance لا تزال تحتوي على period_number';
    END IF;

    -- 4. term_id موجود كـ NOT NULL في الجداول الثلاثة المُعدَّلة
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name  = 'term_id'
      AND is_nullable  = 'NO'
      AND table_name IN (
          'timetable_slots',
          'period_attendance',
          'student_daily_attendance'
      );

    IF v_count <> 3 THEN
        RAISE EXCEPTION
            'FAIL: term_id NOT NULL مفقود من % جدول — المتوقع 3',
            (3 - v_count);
    END IF;

    -- 5. stage_id موجود كـ NOT NULL على classes
    SELECT is_nullable INTO v_col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'classes'
      AND column_name  = 'stage_id';

    IF v_col IS NULL OR v_col = 'YES' THEN
        RAISE EXCEPTION
            'FAIL: classes.stage_id إما غير موجود أو nullable';
    END IF;

    -- 6. periods مرتبطة بـ school_stages (وليس بـ school_id مباشرة كـ UNIQUE)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name        = 'periods'
          AND constraint_type   = 'UNIQUE'
    ) THEN
        RAISE EXCEPTION 'FAIL: periods لا تحتوي على UNIQUE constraint';
    END IF;

    RAISE NOTICE '✅ M59 اكتمل بنجاح:';
    RAISE NOTICE '   ✓ school_stages + terms + periods أُنشئت مع RLS';
    RAISE NOTICE '   ✓ periods مربوطة بـ school_stage_id — تدعم أوقات مختلفة بين المراحل';
    RAISE NOTICE '   ✓ timetable_slots: term/period INT → term_id/period_id NOT NULL FK';
    RAISE NOTICE '   ✓ period_attendance: period_number INT → period_id/term_id NOT NULL FK';
    RAISE NOTICE '   ✓ student_daily_attendance: term_id NOT NULL أُضيف';
    RAISE NOTICE '   ✓ classes: stage_id NOT NULL أُضيف';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ترتيب الإعداد المطلوب:';
    RAISE NOTICE '   1. school_stages → 2. terms → 3. periods → 4. classes → 5. timetable_slots';
END $$;

COMMIT;
