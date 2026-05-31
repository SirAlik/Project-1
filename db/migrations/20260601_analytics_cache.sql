-- =================================================================
-- M72: طبقة التحليلات والكاش — Phase 7
-- التاريخ: 2026-06-01
-- =================================================================
-- الجداول:
--   daily_kpis              — مؤشرات أداء يومية مخزنة مسبقاً لكل دور
--   class_weekly_summary    — ملخص أسبوعي للشعبة
--   student_analytics_cache — ملخص الطالب التراكمي للسنة الدراسية
--
-- المبدأ:
--   هذه جداول كاش — تُكتب عبر service_role (cron / Edge Function)
--   وتُقرأ من الواجهة. لا توجد INSERT policies للمستخدمين العاديين.
--   بيانات حية ← cron يومي → كاش → واجهة سريعة.
--
-- ملاحظة: qa_kpis_daily موجود مسبقاً للـ QA فقط.
--          daily_kpis هنا يغطي جميع الأدوار (مدير، وكيل، إلخ).
--
-- التبعيات:
--   ✅ schools · classes · academic_years · student_profiles · subjects
--   ✅ get_my_school_id() — R00
-- =================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- Preflight
-- ────────────────────ِ}────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'daily_kpis'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: daily_kpis موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'class_weekly_summary'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: class_weekly_summary موجودة مسبقاً';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_analytics_cache'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_analytics_cache موجودة مسبقاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_my_school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: get_my_school_id() غير موجودة — طبّق R00 أولاً';
    END IF;

    RAISE NOTICE 'Preflight ✓';
END $$;

-- ════════════════════════════════════════════════════════════════
-- 1. daily_kpis — مؤشرات أداء يومية مخزنة مسبقاً
-- ════════════════════════════════════════════════════════════════
-- صف واحد لكل (مدرسة، تاريخ، دور).
-- metrics JSONB مرن حسب الدور:
--   principal:          { attendance_rate, absent_count, late_count, behavioral_today, health_cases_today, lrc_visits_today }
--   student_affairs_vp: { absent_today, late_today, exits_today, behavioral_refs_new, contracts_pending }
--   health_coordinator: { visits_today, referrals_today, supplies_low_count, canteen_checked }
--   school_librarian:   { loans_active, overdue_count, visits_today, bookings_pending }
--   student_counselor:  { cases_open, sessions_today, referrals_pending, risk_high_count }
--   quality_coordinator:{ indicators_below_target, evidence_today, rubrics_active, observations_this_week }
-- ────────────────────────────────────────────────────────────────

CREATE TABLE public.daily_kpis (
    id           uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    date         date        NOT NULL,
    role         text        NOT NULL CHECK (role IN (
                     'school_principal',
                     'student_affairs_vp',
                     'academic_vp',
                     'school_affairs_vp',
                     'health_coordinator',
                     'quality_coordinator',
                     'school_librarian',
                     'student_counselor',
                     'school_admin'
                 )),
    metrics      jsonb       NOT NULL DEFAULT '{}',
    computed_at  timestamptz NOT NULL DEFAULT now(),

    UNIQUE (school_id, date, role)
);

ALTER TABLE public.daily_kpis ENABLE ROW LEVEL SECURITY;

-- قراءة: كل موظف يرى KPIs دوره في مدرسته + مدير + admin
CREATE POLICY "dkpi_select" ON public.daily_kpis
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (
            -- المدير والمنسق يرون الكل
            (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'school_principal')
            -- كل دور يرى KPIs نفسه فقط
            OR role = (auth.jwt() -> 'app_metadata' ->> 'role')
        )
    )
);

-- كتابة: service_role فقط (cron/Edge Function) — لا INSERT من المستخدم
-- استثناء: school_admin يستطيع upsert للاختبار
CREATE POLICY "dkpi_insert" ON public.daily_kpis
FOR INSERT TO authenticated
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

CREATE POLICY "dkpi_update" ON public.daily_kpis
FOR UPDATE TO authenticated
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

-- فهارس: الاستعلام الشائع هو "اليوم + دوري"
CREATE INDEX idx_dkpi_school_date ON public.daily_kpis (school_id, date DESC);
CREATE INDEX idx_dkpi_role_date   ON public.daily_kpis (school_id, role, date DESC);

-- ════════════════════════════════════════════════════════════════
-- 2. class_weekly_summary — ملخص أسبوعي للشعبة
-- ════════════════════════════════════════════════════════════════
-- صف واحد لكل (مدرسة، شعبة، أسبوع).
-- week_start = دائماً يوم الأحد (بداية الأسبوع الدراسي).
-- ────────────────────────────────────────────────────────────────

CREATE TABLE public.class_weekly_summary (
    id                  uuid        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id           uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id            uuid        NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id    uuid        REFERENCES public.academic_years(id),
    week_start          date        NOT NULL,

    -- غياب وتأخر
    total_absences      int         NOT NULL DEFAULT 0 CHECK (total_absences >= 0),
    total_lates         int         NOT NULL DEFAULT 0 CHECK (total_lates >= 0),
    total_exits         int         NOT NULL DEFAULT 0 CHECK (total_exits >= 0),

    -- مشاركة (من events نجم الحصة وما يشبهه)
    avg_participation   numeric(5,2) CHECK (avg_participation BETWEEN 0 AND 100),

    -- سلوك
    behavior_incidents  int         NOT NULL DEFAULT 0 CHECK (behavior_incidents >= 0),
    referrals_count     int         NOT NULL DEFAULT 0 CHECK (referrals_count >= 0),

    -- مكتبة وصحة
    lrc_visits          int         NOT NULL DEFAULT 0 CHECK (lrc_visits >= 0),
    health_cases        int         NOT NULL DEFAULT 0 CHECK (health_cases >= 0),

    computed_at         timestamptz NOT NULL DEFAULT now(),

    UNIQUE (school_id, class_id, week_start)
);

ALTER TABLE public.class_weekly_summary ENABLE ROW LEVEL SECURITY;

-- قراءة: المعلم يرى شعبته، الإداريون يرون الكل
CREATE POLICY "cws_select" ON public.class_weekly_summary
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'academic_vp',
            'student_affairs_vp', 'quality_coordinator', 'teacher'
        )
    )
);

CREATE POLICY "cws_insert" ON public.class_weekly_summary
FOR INSERT TO authenticated
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

CREATE POLICY "cws_update" ON public.class_weekly_summary
FOR UPDATE TO authenticated
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

CREATE INDEX idx_cws_school_class  ON public.class_weekly_summary (school_id, class_id, week_start DESC);
CREATE INDEX idx_cws_school_week   ON public.class_weekly_summary (school_id, week_start DESC);

-- ════════════════════════════════════════════════════════════════
-- 3. student_analytics_cache — ملخص الطالب التراكمي
-- ════════════════════════════════════════════════════════════════
-- صف واحد لكل طالب (PK = student_id + academic_year_id).
-- يُحدَّث يومياً من cron — يخزن مؤشرات تراكمية منذ بداية السنة.
-- ────────────────────────────────────────────────────────────────

CREATE TABLE public.student_analytics_cache (
    student_id              uuid        NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    school_id               uuid        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id        uuid        REFERENCES public.academic_years(id),

    -- حضور
    total_absences_ytd      int         NOT NULL DEFAULT 0 CHECK (total_absences_ytd >= 0),
    total_lates_ytd         int         NOT NULL DEFAULT 0 CHECK (total_lates_ytd >= 0),
    total_exits_ytd         int         NOT NULL DEFAULT 0 CHECK (total_exits_ytd >= 0),
    attendance_rate         numeric(5,2) CHECK (attendance_rate BETWEEN 0 AND 100),
    most_missed_subject_id  uuid        REFERENCES public.subjects(id),

    -- سلوك
    behavior_incidents_ytd  int         NOT NULL DEFAULT 0 CHECK (behavior_incidents_ytd >= 0),
    referrals_ytd           int         NOT NULL DEFAULT 0 CHECK (referrals_ytd >= 0),
    behavior_score          numeric(5,2) CHECK (behavior_score BETWEEN 0 AND 100),

    -- مكتبة
    lrc_loans_ytd           int         NOT NULL DEFAULT 0 CHECK (lrc_loans_ytd >= 0),
    lrc_visits_attended_ytd int         NOT NULL DEFAULT 0,

    -- خطر (يُحسب من الغياب + السلوك + الإحالات)
    risk_score              numeric(5,2) CHECK (risk_score BETWEEN 0 AND 100),
    risk_level              text        CHECK (risk_level IN ('low', 'medium', 'high')),

    updated_at              timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (student_id, academic_year_id)
);

ALTER TABLE public.student_analytics_cache ENABLE ROW LEVEL SECURITY;

-- قراءة: الأدوار التي تحتاج ملفات الطلاب
CREATE POLICY "sac_select" ON public.student_analytics_cache
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'academic_vp',
            'student_affairs_vp', 'student_counselor',
            'quality_coordinator', 'teacher'
        )
    )
);

CREATE POLICY "sac_insert" ON public.student_analytics_cache
FOR INSERT TO authenticated
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

CREATE POLICY "sac_update" ON public.student_analytics_cache
FOR UPDATE TO authenticated
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
)
WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('school_admin', 'system_owner')
);

CREATE INDEX idx_sac_school ON public.student_analytics_cache (school_id, academic_year_id);
CREATE INDEX idx_sac_risk   ON public.student_analytics_cache (school_id, risk_level)
    WHERE risk_level IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- التحقق النهائي
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_tables    text[] := ARRAY['daily_kpis','class_weekly_summary','student_analytics_cache'];
    v_tbl       text;
    v_rls       boolean;
    v_pol_count int;
BEGIN
    FOREACH v_tbl IN ARRAY v_tables LOOP
        -- RLS مفعّل؟
        SELECT relrowsecurity INTO v_rls FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relname = v_tbl;

        IF NOT COALESCE(v_rls, false) THEN
            RAISE EXCEPTION 'FAIL: RLS غير مفعَّل على %', v_tbl;
        END IF;

        -- على الأقل 3 سياسات؟
        SELECT COUNT(*) INTO v_pol_count FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_tbl;

        IF v_pol_count < 3 THEN
            RAISE EXCEPTION 'FAIL: % — % سياسات فقط (المتوقع 3+)', v_tbl, v_pol_count;
        END IF;

        -- school_id NOT NULL؟
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = v_tbl
              AND column_name  = 'school_id'
              AND is_nullable  = 'NO'
        ) THEN
            RAISE EXCEPTION 'FAIL: % — school_id ليست NOT NULL', v_tbl;
        END IF;

        RAISE NOTICE '  ✓ % — RLS + school_id NOT NULL + % سياسات', v_tbl, v_pol_count;
    END LOOP;

    RAISE NOTICE '✅ M72 اكتمل — Phase 7: Analytics Cache Layer جاهز';
    RAISE NOTICE '   الخطوة التالية: cron daily يُغذّي هذه الجداول من period_attendance + events + lrc_loans';
END $$;

COMMIT;
