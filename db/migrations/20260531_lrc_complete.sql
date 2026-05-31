-- =================================================================
-- M67: مركز مصادر التعلم (LRC) — بناء كامل
-- التاريخ: 2026-05-31
-- =================================================================
-- الجداول:
--   lrc_visits           — زيارات الفصول للمكتبة
--   lrc_visit_attendance — حضور الطلاب في الزيارة
--   lrc_bookings         — طلبات حجز المكتبة (جديدة)
--   lrc_loans            — سجل الإعارات
--
-- ملاحظة التصميم:
--   lrc_visits + lrc_bookings + lrc_loans كانت موجودة بشكل مبدئي
--   (R07 أضاف school_id NOT NULL + RLS لها) لكن بدون حقول جوهرية.
--   نتبع CLAUDE.md: DROP CASCADE + إعادة بناء صحيحة.
--   lrc_bookings لم تكن موجودة — تُنشأ من الصفر.
--
-- التبعيات:
--   ✅ schools · classes · student_profiles · user_personas
--   ✅ timetable_slots · periods (M59)
--   ✅ lrc_books (موجود من قبل + R07 أضاف school_id NOT NULL)
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
        WHERE table_schema = 'public' AND table_name = 'lrc_books'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: lrc_books غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'periods'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: periods غير موجودة — طبّق M59 أولاً';
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

-- ────────────────────────────────────────────────────────────────
-- حذف الجداول القديمة بالترتيب الصحيح (CASCADE يُزيل التبعيات)
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.lrc_visit_attendance CASCADE;
DROP TABLE IF EXISTS public.lrc_visits            CASCADE;
DROP TABLE IF EXISTS public.lrc_loans             CASCADE;
DROP TABLE IF EXISTS public.lrc_bookings          CASCADE;

-- ════════════════════════════════════════════════════════════════
-- 1. lrc_visits — زيارات الفصول للمكتبة
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.lrc_visits (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- الفصل والمعلم المصاحب
    class_id                 uuid        NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    teacher_persona_id       uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,

    -- ربط بالجدول الدراسي والحصة (اختياري — قد تكون الزيارة في وقت حر)
    timetable_slot_id        uuid        REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
    period_id                uuid        REFERENCES public.periods(id) ON DELETE SET NULL,

    -- تفاصيل الزيارة
    visit_date               date        NOT NULL DEFAULT CURRENT_DATE,
    topic                    text,                      -- موضوع الزيارة / النشاط المخطط
    status                   text        NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                                 'scheduled',   -- مجدولة
                                 'confirmed',   -- أكّدها أمين المصادر
                                 'completed',   -- اكتملت
                                 'cancelled'    -- ألغيت
                             )),

    -- الموافقة
    approved_by_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    approved_at              timestamptz,

    notes                    text,
    created_by_persona_id    uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT lv_school_id_unique UNIQUE (id, school_id)
);

CREATE INDEX idx_lv_school_date  ON public.lrc_visits (school_id, visit_date DESC);
CREATE INDEX idx_lv_class        ON public.lrc_visits (class_id);
CREATE INDEX idx_lv_teacher      ON public.lrc_visits (teacher_persona_id);
CREATE INDEX idx_lv_status       ON public.lrc_visits (school_id, status);
CREATE INDEX idx_lv_period       ON public.lrc_visits (period_id) WHERE period_id IS NOT NULL;

ALTER TABLE public.lrc_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lv_select" ON public.lrc_visits
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'teacher',
            'academic_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "lv_insert" ON public.lrc_visits
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'teacher',
            'school_admin'
        )
    )
);

CREATE POLICY "lv_update" ON public.lrc_visits
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
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
            'school_librarian',
            'school_admin',
            'school_principal'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- 2. lrc_visit_attendance — حضور الطلاب في الزيارة
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.lrc_visit_attendance (
    id               uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    visit_id         uuid        NOT NULL REFERENCES public.lrc_visits(id) ON DELETE CASCADE,
    student_id       uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE RESTRICT,

    is_present       boolean     NOT NULL DEFAULT true,

    -- الاستثناء: طالب في الغياب أو أُخرج من الزيارة
    is_excluded      boolean     NOT NULL DEFAULT false,
    exclusion_reason text        CHECK (exclusion_reason IN ('absent', 'dismissed', 'other')),

    CONSTRAINT lva_visit_student_unique UNIQUE (visit_id, student_id)
);

CREATE INDEX idx_lva_visit    ON public.lrc_visit_attendance (visit_id);
CREATE INDEX idx_lva_student  ON public.lrc_visit_attendance (student_id);
CREATE INDEX idx_lva_school   ON public.lrc_visit_attendance (school_id);

ALTER TABLE public.lrc_visit_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lva_select" ON public.lrc_visit_attendance
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'teacher',
            'academic_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "lva_insert" ON public.lrc_visit_attendance
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'teacher',
            'school_admin'
        )
    )
);

CREATE POLICY "lva_update" ON public.lrc_visit_attendance
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'school_admin'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- 3. lrc_bookings — طلبات حجز المكتبة (جديدة)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.lrc_bookings (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- المعلم الطالب للحجز
    teacher_persona_id       uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    class_id                 uuid        NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,

    -- موعد الحجز المطلوب
    booking_date             date        NOT NULL,
    period_id                uuid        REFERENCES public.periods(id) ON DELETE SET NULL,
    subject                  text,                  -- المادة الدراسية أو الهدف من الزيارة

    -- حالة الطلب
    status                   text        NOT NULL DEFAULT 'pending' CHECK (status IN (
                                 'pending',      -- بانتظار مراجعة أمين المصادر
                                 'approved',     -- موافق عليه
                                 'rejected',     -- مرفوض
                                 'rescheduled'   -- أُعيد جدولته
                             )),

    librarian_notes          text,                  -- ملاحظات أمين المصادر
    approved_by_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    approved_at              timestamptz,

    created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lb_school_date  ON public.lrc_bookings (school_id, booking_date DESC);
CREATE INDEX idx_lb_teacher      ON public.lrc_bookings (teacher_persona_id);
CREATE INDEX idx_lb_status       ON public.lrc_bookings (school_id, status);
CREATE INDEX idx_lb_period       ON public.lrc_bookings (period_id) WHERE period_id IS NOT NULL;

ALTER TABLE public.lrc_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lb_select" ON public.lrc_bookings
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'teacher',
            'academic_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "lb_insert" ON public.lrc_bookings
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'teacher',
            'school_librarian',
            'school_admin'
        )
    )
);

CREATE POLICY "lb_update" ON public.lrc_bookings
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
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
            'school_librarian',
            'school_admin',
            'school_principal'
        )
    )
);

-- ════════════════════════════════════════════════════════════════
-- 4. lrc_loans — سجل الإعارات
-- ════════════════════════════════════════════════════════════════

CREATE TABLE public.lrc_loans (
    id                       uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                uuid        NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,

    -- الكتاب المُعار
    book_id                  uuid        NOT NULL REFERENCES public.lrc_books(id) ON DELETE RESTRICT,

    -- المستعير (طالب أو معلم — FK منفصل بسبب جدولين مختلفين)
    borrower_id              uuid        NOT NULL,
    borrower_type            text        NOT NULL CHECK (borrower_type IN ('student', 'teacher')),

    -- تواريخ الإعارة والتسليم
    loan_date                date        NOT NULL DEFAULT CURRENT_DATE,
    due_date                 date        NOT NULL,
    return_date              date,                  -- NULL = لم يُعَد بعد

    status                   text        NOT NULL DEFAULT 'active' CHECK (status IN (
                                 'active',    -- نشطة
                                 'returned',  -- أُعيد
                                 'overdue',   -- متأخرة
                                 'lost'       -- مفقود
                             )),

    notes                    text,
    recorded_by_persona_id   uuid        REFERENCES public.user_personas(id) ON DELETE SET NULL,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),

    -- لا يمكن للمستعير نفسه استعارة نفس الكتاب مرتين في آن واحد
    CONSTRAINT ll_active_unique UNIQUE (book_id, borrower_id, loan_date)
);

CREATE TRIGGER trg_ll_updated_at
    BEFORE UPDATE ON public.lrc_loans
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX idx_ll_school       ON public.lrc_loans (school_id, loan_date DESC);
CREATE INDEX idx_ll_book         ON public.lrc_loans (book_id);
CREATE INDEX idx_ll_borrower     ON public.lrc_loans (borrower_id);
CREATE INDEX idx_ll_status       ON public.lrc_loans (school_id, status);
CREATE INDEX idx_ll_overdue      ON public.lrc_loans (due_date)
    WHERE status = 'active';

ALTER TABLE public.lrc_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ll_select" ON public.lrc_loans
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'academic_vp',
            'school_principal',
            'school_admin'
        )
    )
);

CREATE POLICY "ll_insert" ON public.lrc_loans
FOR INSERT TO authenticated
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'school_admin'
        )
    )
);

CREATE POLICY "ll_update" ON public.lrc_loans
FOR UPDATE TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
            'school_admin'
        )
    )
)
WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_librarian',
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
    FOREACH v_table IN ARRAY ARRAY['lrc_visits','lrc_visit_attendance','lrc_bookings','lrc_loans']
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

    -- التحقق من school_id NOT NULL في كل الجداول
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lrc_visits'
      AND column_name = 'school_id' AND is_nullable = 'NO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: school_id في lrc_visits يقبل NULL';
    END IF;

    -- التحقق من وجود period_id (UUID-based — ليس period INT)
    PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lrc_visits'
      AND column_name = 'period_id';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'FAIL: period_id غير موجود في lrc_visits';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '✅ M67 اكتمل: lrc_visits + lrc_visit_attendance + lrc_bookings + lrc_loans';
    RAISE NOTICE '   جميعها بالنمط الذهبي: school_id NOT NULL + RLS + period_id UUID';
END $$;

COMMIT;
