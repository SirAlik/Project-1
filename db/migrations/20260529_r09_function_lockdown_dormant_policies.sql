-- ============================================================
-- R09: إغلاق الدوال + السياسات الخاملة + z_archive
-- ============================================================
-- يعالج نتائج Supabase Lint الجديدة:
--
--   WARN-A — 11 دالة بـ mutable search_path (Function Hijacking)
--   WARN-B — 5+ دوال SECURITY DEFINER مكشوفة للـ anon/PUBLIC
--   WARN-C — 3 سياسات USING(true)/WITH CHECK(true)
--   WARN-D — z_archive schema مكشوف للـ anon
--   INFO-1 — 6 جداول RLS بدون سياسات (بيانات محجوبة بالكامل)
--   CRITICAL — rpc_corrupt_system دالة مشبوهة يجب إسقاطها
--
-- المبدأ: لا soft failures — إذا فشل شيء يجب أن ينفجر الـ transaction
-- ============================================================

BEGIN;

-- ============================================================
-- WARN-A: إصلاح mutable search_path على 11 دالة
-- الخطر: path injection — مهاجم يُنشئ schema ويختطف الدالة
-- الحل: ALTER FUNCTION مباشر — ينفجر إذا كانت الدالة غير موجودة
-- ============================================================

ALTER FUNCTION public.fn_check_absence()                SET search_path TO public;
ALTER FUNCTION public.fn_sal_set_updated_at()           SET search_path TO public;
ALTER FUNCTION public.sync_enrollment_to_profile()      SET search_path TO public;
ALTER FUNCTION public.update_modified_column()          SET search_path TO public;
ALTER FUNCTION public.get_my_role()                     SET search_path TO public;
ALTER FUNCTION public.is_admin()                        SET search_path TO public;
ALTER FUNCTION public.close_expired_invites(text, uuid) SET search_path TO public;
ALTER FUNCTION public.fn_generate_procurement_number()  SET search_path TO public;
ALTER FUNCTION public.cleanup_expired_idempotency()     SET search_path TO public;
ALTER FUNCTION public.fn_prevent_wft_update()           SET search_path TO public;
ALTER FUNCTION public.fn_prevent_mln_update()           SET search_path TO public;

-- ============================================================
-- CRITICAL: إسقاط rpc_corrupt_system — دالة بلا مسوّغ في نظام مدرسي
-- ============================================================

DROP FUNCTION IF EXISTS public.rpc_corrupt_system(uuid);
DROP FUNCTION IF EXISTS public.rpc_corrupt_system();

-- ============================================================
-- WARN-B: REVOKE من PUBLIC + anon على كل الدوال الحرجة
-- R08 أغلق anon صراحةً لكن PUBLIC pseudo-role كان يمنح الوصول بالوراثة
-- الحل: REVOKE FROM PUBLIC يقطع الوراثة — مباشر بلا DO blocks
-- ينفجر إذا كانت الدالة غير موجودة — هذا صحيح وهذا المطلوب
-- ============================================================

-- block_privileged_field_changes — trigger، لا يُستدعى via REST إطلاقاً
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.block_privileged_field_changes() FROM anon;

-- handle_new_user — auth trigger، يُستدعى تلقائياً فقط
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- is_admin — مساعدة RLS قديمة
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- get_my_role — مساعدة RLS، authenticated فقط
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- close_expired_invites — عملية admin، authenticated المخوّلون فقط
REVOKE EXECUTE ON FUNCTION public.close_expired_invites(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_expired_invites(text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.close_expired_invites(text, uuid) TO authenticated;

-- archive_old_audit_logs — عملية admin خالصة، service_role فقط
REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_old_audit_logs() FROM anon;

-- cleanup_old_rate_limits — عملية admin خالصة
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon;

-- ============================================================
-- WARN-C: إسقاط سياسات USING(true)/WITH CHECK(true) وإعادة بناؤها
-- ============================================================

-- C-1: action_audit_log — WITH CHECK (true) يتيح لأي مستخدم حقن audit logs
DROP POLICY IF EXISTS "audit_insert_policy" ON public.action_audit_log;

CREATE POLICY "audit_insert_policy" ON public.action_audit_log
    FOR INSERT TO authenticated, service_role
    WITH CHECK (
        school_id = get_my_school_id()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    );

-- C-2: trip_consents — USING(true)/WITH CHECK(true) لكل العمليات = لا عزل
DROP POLICY IF EXISTS "Public Read/Update Trip Consents" ON public.trip_consents;
DROP POLICY IF EXISTS "trip_consents_select"             ON public.trip_consents;
DROP POLICY IF EXISTS "trip_consents_insert"             ON public.trip_consents;
DROP POLICY IF EXISTS "trip_consents_update"             ON public.trip_consents;

CREATE POLICY "trip_consents_select" ON public.trip_consents
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

CREATE POLICY "trip_consents_insert" ON public.trip_consents
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader',
                'student_affairs_vp', 'parent'
            )
        )
    );

CREATE POLICY "trip_consents_update" ON public.trip_consents
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

-- C-3: z_archive.action_idempotency — USING(true)/WITH CHECK(true) لكل العمليات
DROP POLICY IF EXISTS "idempotency_all" ON z_archive.action_idempotency;

CREATE POLICY "idempotency_archive_all" ON z_archive.action_idempotency
    FOR ALL TO authenticated, service_role
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- WARN-D: إغلاق z_archive من anon
-- ============================================================

REVOKE ALL ON ALL TABLES    IN SCHEMA z_archive FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA z_archive FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA z_archive FROM anon;
REVOKE USAGE ON SCHEMA z_archive FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA z_archive REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA z_archive REVOKE ALL ON SEQUENCES FROM anon;

-- ============================================================
-- INFO-1: سياسات للجداول الـ 6 ذات RLS بدون سياسات
-- بدون سياسات + RLS مُفعَّل = كل الصفوف محجوبة — التطبيق يرى فراغاً
-- school_id مطلوب على كل جدول — إذا لم يكن موجوداً PostgreSQL تنفجر
-- هذا صحيح: الهيكل مكسور ويجب اكتشافه هنا لا إخفاؤه
-- ============================================================

-- ── activity_trips ─────────────────────────────────────────
DROP POLICY IF EXISTS "activity_trips_select" ON public.activity_trips;
DROP POLICY IF EXISTS "activity_trips_insert" ON public.activity_trips;
DROP POLICY IF EXISTS "activity_trips_update" ON public.activity_trips;
DROP POLICY IF EXISTS "activity_trips_delete" ON public.activity_trips;

CREATE POLICY "activity_trips_select" ON public.activity_trips
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

CREATE POLICY "activity_trips_insert" ON public.activity_trips
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader'
            )
        )
    );

CREATE POLICY "activity_trips_update" ON public.activity_trips
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader'
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader'
            )
        )
    );

-- ── club_assignments ────────────────────────────────────────
DROP POLICY IF EXISTS "club_assignments_select" ON public.club_assignments;
DROP POLICY IF EXISTS "club_assignments_insert" ON public.club_assignments;
DROP POLICY IF EXISTS "club_assignments_update" ON public.club_assignments;
DROP POLICY IF EXISTS "club_assignments_delete" ON public.club_assignments;

CREATE POLICY "club_assignments_select" ON public.club_assignments
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

CREATE POLICY "club_assignments_insert" ON public.club_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader'
            )
        )
    );

CREATE POLICY "club_assignments_delete" ON public.club_assignments
    FOR DELETE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader'
            )
        )
    );

-- ── club_evaluations ────────────────────────────────────────
DROP POLICY IF EXISTS "club_evaluations_select" ON public.club_evaluations;
DROP POLICY IF EXISTS "club_evaluations_insert" ON public.club_evaluations;
DROP POLICY IF EXISTS "club_evaluations_update" ON public.club_evaluations;

CREATE POLICY "club_evaluations_select" ON public.club_evaluations
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR school_id = get_my_school_id()
    );

CREATE POLICY "club_evaluations_insert" ON public.club_evaluations
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader',
                'quality_coordinator'
            )
        )
    );

CREATE POLICY "club_evaluations_update" ON public.club_evaluations
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader',
                'quality_coordinator'
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'activity_leader',
                'quality_coordinator'
            )
        )
    );

-- ── guardians ───────────────────────────────────────────────
DROP POLICY IF EXISTS "guardians_select" ON public.guardians;
DROP POLICY IF EXISTS "guardians_insert" ON public.guardians;
DROP POLICY IF EXISTS "guardians_update" ON public.guardians;

CREATE POLICY "guardians_select" ON public.guardians
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'student_affairs_vp',
                'school_secretary', 'student_counselor'
            )
        )
    );

CREATE POLICY "guardians_insert" ON public.guardians
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'student_affairs_vp', 'school_secretary'
            )
        )
    );

CREATE POLICY "guardians_update" ON public.guardians
    FOR UPDATE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'student_affairs_vp', 'school_secretary'
            )
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'student_affairs_vp', 'school_secretary'
            )
        )
    );

-- ── parent_reports ──────────────────────────────────────────
DROP POLICY IF EXISTS "parent_reports_select" ON public.parent_reports;
DROP POLICY IF EXISTS "parent_reports_insert" ON public.parent_reports;

CREATE POLICY "parent_reports_select" ON public.parent_reports
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'student_affairs_vp',
                'student_counselor', 'school_secretary'
            )
        )
    );

CREATE POLICY "parent_reports_insert" ON public.parent_reports
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'parent', 'school_admin', 'student_affairs_vp'
            )
        )
    );

-- ── student_guardians ───────────────────────────────────────
DROP POLICY IF EXISTS "student_guardians_select" ON public.student_guardians;
DROP POLICY IF EXISTS "student_guardians_insert" ON public.student_guardians;
DROP POLICY IF EXISTS "student_guardians_delete" ON public.student_guardians;

CREATE POLICY "student_guardians_select" ON public.student_guardians
    FOR SELECT TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'school_principal', 'student_affairs_vp',
                'student_counselor', 'school_secretary'
            )
        )
    );

CREATE POLICY "student_guardians_insert" ON public.student_guardians
    FOR INSERT TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'student_affairs_vp', 'school_secretary'
            )
        )
    );

CREATE POLICY "student_guardians_delete" ON public.student_guardians
    FOR DELETE TO authenticated
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
        OR (
            school_id = get_my_school_id()
            AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
                'school_admin', 'student_affairs_vp'
            )
        )
    );

-- ============================================================
-- التحقق النهائي — RAISE EXCEPTION على أي مخالفة
-- ============================================================
DO $$
DECLARE
    v_count integer;
BEGIN
    -- 1. rpc_corrupt_system يجب أن تكون محذوفة
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rpc_corrupt_system'
    ) THEN
        RAISE EXCEPTION 'FAIL CRITICAL: rpc_corrupt_system لا تزال موجودة!';
    END IF;

    -- 2. audit_insert_policy يجب ألا تكون WITH CHECK (true)
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'action_audit_log'
          AND policyname = 'audit_insert_policy'
          AND with_check = 'true'
    ) THEN
        RAISE EXCEPTION 'FAIL WARN-C: audit_insert_policy لا تزال WITH CHECK (true)';
    END IF;

    -- 3. trip_consents لا يجب أن تحتوي على سياسة USING(true)
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'trip_consents'
          AND qual       = 'true'
    ) THEN
        RAISE EXCEPTION 'FAIL WARN-C: trip_consents لا تزال بها سياسة USING(true)';
    END IF;

    -- 4. الجداول الـ 6 يجب أن تملك سياسات الآن
    SELECT COUNT(DISTINCT tablename) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
          'activity_trips', 'club_assignments', 'club_evaluations',
          'guardians', 'parent_reports', 'student_guardians'
      );

    IF v_count < 6 THEN
        RAISE EXCEPTION 'FAIL INFO-1: % جداول فقط من 6 لديها سياسات — المتوقع 6', v_count;
    END IF;

    -- 5. z_archive يجب أن لا يكون مكشوفاً للـ anon
    IF EXISTS (
        SELECT 1 FROM information_schema.role_usage_grants
        WHERE object_schema = 'z_archive'
          AND grantee       = 'anon'
    ) THEN
        RAISE EXCEPTION 'FAIL WARN-D: anon لا يزال يملك USAGE على z_archive';
    END IF;

    RAISE NOTICE '✅ R09 اكتمل — كل الفحوصات اجتازت:';
    RAISE NOTICE '   WARN-A: 11 دالة — search_path مُثبَّت';
    RAISE NOTICE '   WARN-B: REVOKE من PUBLIC + anon على الدوال الحرجة';
    RAISE NOTICE '   WARN-C: 3 سياسات USING(true) — مُدمَّرة وأُعيد بناؤها';
    RAISE NOTICE '   WARN-D: z_archive — مُغلَق من anon';
    RAISE NOTICE '   INFO-1: 6 جداول — سياسات JWT صريحة';
    RAISE NOTICE '   CRITICAL: rpc_corrupt_system — محذوفة';

END;
$$;

COMMIT;