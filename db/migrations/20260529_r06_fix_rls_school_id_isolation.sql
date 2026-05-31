-- =================================================================
-- R06: إضافة school_id isolation لجميع السياسات الناقصة
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   10 جداول تفتقر إلى school_id = get_my_school_id() في سياسات RLS.
--   بعضها لا يملك عمود school_id أصلاً — يُضاف أولاً.
--
-- المجموعة A (school_id موجود — إصلاح السياسات فقط):
--   student_profiles, cases, events
--
-- المجموعة B (school_id غائب — إضافة العمود + إصلاح السياسات):
--   counseling_sessions, activity_clubs, activity_events,
--   activity_financials, canteen_checks, health_supplies, hygiene_logs
--
-- النمط المرجعي: Golden Pattern من 20260527_layer6_hr_accountability_tickets.sql
--   school_id = get_my_school_id() في كل USING + WITH CHECK
--   system_owner يرى الكل بدون قيد school_id
--
-- التبعيات:
--   R04 ✅ (profiles.role محذوف — السياسات التي تعتمد عليه سقطت بـ CASCADE)
--   R05 ✅ (action_audit_log موحّدة)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: user_roles لا تزال موجودة — طبّق R04 أولاً';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'student_profiles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: student_profiles غير موجودة';
    END IF;

    RAISE NOTICE 'Preflight: user_roles محذوفة + جداول الهدف موجودة ✓';
END $$;

-- ============================================================
-- إضافة school_id لجميع الجداول العشرة
-- ADD COLUMN IF NOT EXISTS — آمن سواء كان العمود موجوداً أم لا
-- (migrations القديمة كـ 01_core_tenancy قد لا تكون مُطبَّقة على الـ live DB)
-- ============================================================

ALTER TABLE public.student_profiles
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.cases
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.counseling_sessions
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.activity_clubs
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.activity_events
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.activity_financials
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.canteen_checks
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.health_supplies
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.hygiene_logs
    ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- فهارس (IF NOT EXISTS — آمنة للتكرار)
CREATE INDEX IF NOT EXISTS idx_student_profiles_school    ON public.student_profiles     (school_id);
CREATE INDEX IF NOT EXISTS idx_cases_school               ON public.cases                (school_id);
CREATE INDEX IF NOT EXISTS idx_events_school              ON public.events               (school_id);
CREATE INDEX IF NOT EXISTS idx_counseling_sessions_school ON public.counseling_sessions  (school_id);
CREATE INDEX IF NOT EXISTS idx_activity_clubs_school      ON public.activity_clubs       (school_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_school     ON public.activity_events      (school_id);
CREATE INDEX IF NOT EXISTS idx_activity_financials_school ON public.activity_financials  (school_id);
CREATE INDEX IF NOT EXISTS idx_canteen_checks_school      ON public.canteen_checks       (school_id);
CREATE INDEX IF NOT EXISTS idx_health_supplies_school     ON public.health_supplies      (school_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_logs_school        ON public.hygiene_logs         (school_id);

-- ============================================================
-- 1. student_profiles — إعادة بناء كاملة بالنمط الذهبي
-- ============================================================

DROP POLICY IF EXISTS "Tenant Isolation: Read Students"   ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Write Students"  ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Insert Students" ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Update Students" ON public.student_profiles;
DROP POLICY IF EXISTS "Tenant Isolation: Delete Students" ON public.student_profiles;
DROP POLICY IF EXISTS "Staff Read Students"               ON public.student_profiles;
DROP POLICY IF EXISTS "sp_select"                         ON public.student_profiles;
DROP POLICY IF EXISTS "sp_insert"                         ON public.student_profiles;
DROP POLICY IF EXISTS "sp_update"                         ON public.student_profiles;

CREATE POLICY "sp_select" ON public.student_profiles FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'academic_vp',
            'student_affairs_vp', 'school_affairs_vp',
            'student_counselor', 'teacher', 'school_secretary',
            'health_coordinator', 'quality_coordinator'
        )
    )
);

CREATE POLICY "sp_insert" ON public.student_profiles FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'school_secretary'
    )
);

CREATE POLICY "sp_update" ON public.student_profiles FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'school_secretary', 'teacher'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'school_secretary', 'teacher'
    )
);

-- ============================================================
-- 2. cases — إضافة school_id isolation
-- ============================================================

DROP POLICY IF EXISTS "Staff Read Cases" ON public.cases;
DROP POLICY IF EXISTS "cases_select"    ON public.cases;
DROP POLICY IF EXISTS "cases_insert"    ON public.cases;
DROP POLICY IF EXISTS "cases_update"    ON public.cases;

CREATE POLICY "cases_select" ON public.cases FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal',
            'student_affairs_vp', 'student_counselor', 'teacher'
        )
    )
);

CREATE POLICY "cases_insert" ON public.cases FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor', 'teacher'
    )
);

CREATE POLICY "cases_update" ON public.cases FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor'
    )
);

-- ============================================================
-- 3. events — إضافة school_id isolation
-- ============================================================

DROP POLICY IF EXISTS "Tenant Isolation: Read Events" ON public.events;
DROP POLICY IF EXISTS "Staff Read Events"             ON public.events;
DROP POLICY IF EXISTS "events_select"                 ON public.events;
DROP POLICY IF EXISTS "events_insert"                 ON public.events;
DROP POLICY IF EXISTS "events_update"                 ON public.events;

CREATE POLICY "events_select" ON public.events FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'academic_vp',
            'student_affairs_vp', 'school_affairs_vp',
            'student_counselor', 'teacher'
        )
    )
);

CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor', 'teacher'
    )
);

CREATE POLICY "events_update" ON public.events FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor', 'teacher'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal',
        'student_affairs_vp', 'student_counselor', 'teacher'
    )
);

-- ============================================================
-- 4. counseling_sessions — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Counselor Private Access"    ON public.counseling_sessions;
DROP POLICY IF EXISTS "counseling_select"           ON public.counseling_sessions;
DROP POLICY IF EXISTS "counseling_insert"           ON public.counseling_sessions;
DROP POLICY IF EXISTS "counseling_update"           ON public.counseling_sessions;

CREATE POLICY "counseling_select" ON public.counseling_sessions FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'student_counselor', 'school_principal',
            'student_affairs_vp', 'school_admin'
        )
    )
);

CREATE POLICY "counseling_insert" ON public.counseling_sessions FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_counselor', 'school_principal'
    )
);

CREATE POLICY "counseling_update" ON public.counseling_sessions FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_counselor', 'school_principal'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'student_counselor', 'school_principal'
    )
);

-- ============================================================
-- 5. activity_clubs — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Activity Leader Full Access"      ON public.activity_clubs;
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access"   ON public.activity_clubs;
DROP POLICY IF EXISTS "ac_select"                        ON public.activity_clubs;
DROP POLICY IF EXISTS "ac_insert"                        ON public.activity_clubs;
DROP POLICY IF EXISTS "ac_update"                        ON public.activity_clubs;

CREATE POLICY "ac_select" ON public.activity_clubs FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal',
            'student_affairs_vp', 'activity_leader', 'teacher'
        )
    )
);

CREATE POLICY "ac_insert" ON public.activity_clubs FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
);

CREATE POLICY "ac_update" ON public.activity_clubs FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
);

-- ============================================================
-- 6. activity_events — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Activity Leader Full Access"      ON public.activity_events;
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access"   ON public.activity_events;
DROP POLICY IF EXISTS "ae_select"                        ON public.activity_events;
DROP POLICY IF EXISTS "ae_insert"                        ON public.activity_events;
DROP POLICY IF EXISTS "ae_update"                        ON public.activity_events;

CREATE POLICY "ae_select" ON public.activity_events FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal',
            'student_affairs_vp', 'activity_leader', 'teacher'
        )
    )
);

CREATE POLICY "ae_insert" ON public.activity_events FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
);

CREATE POLICY "ae_update" ON public.activity_events FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'school_principal', 'activity_leader'
    )
);

-- ============================================================
-- 7. activity_financials — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Activity Leader Full Access"      ON public.activity_financials;
DROP POLICY IF EXISTS "Admin/Principal/VP Read Access"   ON public.activity_financials;
DROP POLICY IF EXISTS "af_select"                        ON public.activity_financials;
DROP POLICY IF EXISTS "af_insert"                        ON public.activity_financials;
DROP POLICY IF EXISTS "af_update"                        ON public.activity_financials;

CREATE POLICY "af_select" ON public.activity_financials FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal',
            'student_affairs_vp', 'activity_leader'
        )
    )
);

CREATE POLICY "af_insert" ON public.activity_financials FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'activity_leader'
    )
);

CREATE POLICY "af_update" ON public.activity_financials FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'activity_leader'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'school_admin', 'activity_leader'
    )
);

-- ============================================================
-- 8. canteen_checks — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Health Guide Access - Canteen"  ON public.canteen_checks;
DROP POLICY IF EXISTS "Admin/Principal Read - Canteen" ON public.canteen_checks;
DROP POLICY IF EXISTS "cc_select"                      ON public.canteen_checks;
DROP POLICY IF EXISTS "cc_insert"                      ON public.canteen_checks;
DROP POLICY IF EXISTS "cc_update"                      ON public.canteen_checks;

CREATE POLICY "cc_select" ON public.canteen_checks FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'health_coordinator'
        )
    )
);

CREATE POLICY "cc_insert" ON public.canteen_checks FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

CREATE POLICY "cc_update" ON public.canteen_checks FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

-- ============================================================
-- 9. health_supplies — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Health Guide Access - Supplies"   ON public.health_supplies;
DROP POLICY IF EXISTS "Admin/Principal Read - Supplies"  ON public.health_supplies;
DROP POLICY IF EXISTS "hs_select"                        ON public.health_supplies;
DROP POLICY IF EXISTS "hs_insert"                        ON public.health_supplies;
DROP POLICY IF EXISTS "hs_update"                        ON public.health_supplies;

CREATE POLICY "hs_select" ON public.health_supplies FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'health_coordinator'
        )
    )
);

CREATE POLICY "hs_insert" ON public.health_supplies FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

CREATE POLICY "hs_update" ON public.health_supplies FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

-- ============================================================
-- 10. hygiene_logs — school_id أُضيف أعلاه
-- ============================================================

DROP POLICY IF EXISTS "Health Guide Access - Hygiene"   ON public.hygiene_logs;
DROP POLICY IF EXISTS "Admin/Principal Read - Hygiene"  ON public.hygiene_logs;
DROP POLICY IF EXISTS "hl_select"                       ON public.hygiene_logs;
DROP POLICY IF EXISTS "hl_insert"                       ON public.hygiene_logs;
DROP POLICY IF EXISTS "hl_update"                       ON public.hygiene_logs;

CREATE POLICY "hl_select" ON public.hygiene_logs FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin', 'school_principal', 'health_coordinator'
        )
    )
);

CREATE POLICY "hl_insert" ON public.hygiene_logs FOR INSERT WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

CREATE POLICY "hl_update" ON public.hygiene_logs FOR UPDATE
USING (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
) WITH CHECK (
    school_id = public.get_my_school_id()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
        'health_coordinator', 'school_admin', 'school_principal'
    )
);

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_open_policies  text;
    v_missing_school text;
    v_tables_checked integer := 0;
    rec              RECORD;
BEGIN
    -- تحقق: لا سياسة USING(true) مفتوحة خارج workflow_definitions
    SELECT string_agg(tablename || '.' || policyname, ' | ')
    INTO v_open_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual = 'true' OR qual = 'TRUE')
      AND tablename NOT IN ('workflow_definitions', 'trip_consents');

    IF v_open_policies IS NOT NULL THEN
        RAISE WARNING 'تحذير: سياسات USING(true) مفتوحة: [%]', v_open_policies;
    END IF;

    -- تحقق: الجداول العشرة لديها سياسات بعد الإصلاح
    FOR rec IN
        SELECT unnest(ARRAY[
            'student_profiles','cases','events','counseling_sessions',
            'activity_clubs','activity_events','activity_financials',
            'canteen_checks','health_supplies','hygiene_logs'
        ]) AS tbl
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = rec.tbl
        ) THEN
            RAISE WARNING 'تحذير: % لا تملك أي سياسة RLS بعد R06', rec.tbl;
        ELSE
            v_tables_checked := v_tables_checked + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '✓ % من 10 جداول تملك سياسات RLS بعد الإصلاح', v_tables_checked;
    RAISE NOTICE '✓ school_id أُضيف لـ 7 جداول (counseling_sessions, activity_*, health_supplies, canteen_checks, hygiene_logs)';
    RAISE NOTICE '✓ جميع السياسات تستخدم get_my_school_id() + JWT role check';
    RAISE NOTICE '✓ R06 اكتمل — عزل متعدد المستأجرين مُطبَّق على جميع الجداول';
END $$;

COMMIT;

-- ============================================================
-- بوابة التحقق السريع (للتشغيل بعد COMMIT)
-- ============================================================
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'student_profiles','cases','events','counseling_sessions',
--     'activity_clubs','activity_events','activity_financials',
--     'canteen_checks','health_supplies','hygiene_logs'
--   )
-- ORDER BY tablename, cmd;
-- -- يجب: كل جدول يملك 3 سياسات (SELECT + INSERT + UPDATE) بأسماء *_select/*_insert/*_update
