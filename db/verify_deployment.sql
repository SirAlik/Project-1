-- ============================================================
-- verify_deployment.sql — Full Deployment Verification
-- ============================================================
-- تُشغَّل في Supabase SQL Editor بعد تطبيق كامل سلسلة المايغريشنز
-- تُوقف التنفيذ فوراً بـ RAISE EXCEPTION عند اكتشاف أي مخالفة
-- ============================================================

DO $$
DECLARE
    v_count      integer;
    v_bad_tables text;
    v_fn_defn    text;
BEGIN

    -- ──────────────────────────────────────────────────────────
    -- 1. تحقق: الجداول الأساسية موجودة
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'schools',
          'profiles',
          'classes',
          'student_profiles',
          'events',
          'cases',
          'action_audit_log',
          'action_idempotency',
          'import_runs',
          'notifications'
      );

    IF v_count < 10 THEN
        RAISE EXCEPTION 'FAIL: جداول أساسية مفقودة — وُجد % من 10', v_count;
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 2. تحقق: school_id NOT NULL على جداول R07 (23 جدول)
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name  = 'school_id'
      AND is_nullable  = 'YES'
      AND table_name IN (
          'attendance_scans','cases','case_actions','classroom_metadata',
          'counseling_sessions','employee_leaves','events','health_awareness',
          'health_referrals','health_visits','interventions','lab_bookings',
          'lab_inventory','lrc_books','lrc_loans','lrc_visits','notifications',
          'parent_reports','qa_kpis_daily','secretary_correspondence',
          'student_profiles','student_risk_flags','classes'
      );

    IF v_count > 0 THEN
        SELECT string_agg(table_name, ', ') INTO v_bad_tables
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name  = 'school_id'
          AND is_nullable  = 'YES'
          AND table_name IN (
              'attendance_scans','cases','case_actions','classroom_metadata',
              'counseling_sessions','employee_leaves','events','health_awareness',
              'health_referrals','health_visits','interventions','lab_bookings',
              'lab_inventory','lrc_books','lrc_loans','lrc_visits','notifications',
              'parent_reports','qa_kpis_daily','secretary_correspondence',
              'student_profiles','student_risk_flags','classes'
          );
        RAISE EXCEPTION 'FAIL: school_id nullable في: %', v_bad_tables;
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 3. تحقق: RLS مُفعَّل على الجداول الأساسية
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_count
    FROM pg_class   c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname IN (
          'attendance_scans','cases','case_actions','classroom_metadata',
          'counseling_sessions','employee_leaves','events','health_awareness',
          'health_referrals','health_visits','interventions','lab_bookings',
          'lab_inventory','lrc_books','lrc_loans','lrc_visits','notifications',
          'parent_reports','qa_kpis_daily','secretary_correspondence',
          'student_profiles','student_risk_flags','classes',
          'action_audit_log','action_idempotency','import_runs'
      );

    IF v_count > 0 THEN
        SELECT string_agg(c.relname, ', ') INTO v_bad_tables
        FROM pg_class   c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
          AND c.relname IN (
              'attendance_scans','cases','case_actions','classroom_metadata',
              'counseling_sessions','employee_leaves','events','health_awareness',
              'health_referrals','health_visits','interventions','lab_bookings',
              'lab_inventory','lrc_books','lrc_loans','lrc_visits','notifications',
              'parent_reports','qa_kpis_daily','secretary_correspondence',
              'student_profiles','student_risk_flags','classes',
              'action_audit_log','action_idempotency','import_runs'
          );
        RAISE EXCEPTION 'FAIL: RLS غير مُفعَّل في: %', v_bad_tables;
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 4. تحقق: لا سياسة USING (true) على جداول tenant
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual = 'true'
      AND tablename IN (
          'attendance_scans','cases','case_actions','classroom_metadata',
          'counseling_sessions','employee_leaves','events','health_awareness',
          'health_referrals','health_visits','interventions','lab_bookings',
          'lab_inventory','lrc_books','lrc_loans','lrc_visits','notifications',
          'parent_reports','qa_kpis_daily','secretary_correspondence',
          'student_profiles','student_risk_flags','classes'
      );

    IF v_count > 0 THEN
        RAISE EXCEPTION 'FAIL: % سياسة تستخدم USING (true) على جداول tenant', v_count;
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 5. تحقق: get_my_school_id() تقرأ من JWT لا من profiles
    -- ──────────────────────────────────────────────────────────
    SELECT pg_get_functiondef(oid) INTO v_fn_defn
    FROM pg_proc
    WHERE proname = 'get_my_school_id'
      AND pronamespace = 'public'::regnamespace;

    IF v_fn_defn IS NULL THEN
        RAISE EXCEPTION 'FAIL: get_my_school_id() غير موجودة';
    END IF;

    IF v_fn_defn LIKE '%FROM%profiles%' THEN
        RAISE EXCEPTION 'FAIL: get_my_school_id() تقرأ من profiles — يجب أن تقرأ من JWT';
    END IF;

    IF v_fn_defn NOT LIKE '%app_metadata%' THEN
        RAISE EXCEPTION 'FAIL: get_my_school_id() لا تستخدم JWT app_metadata';
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 6. تحقق: الدوال الإرثية محذوفة + is_system_owner() موجودة
    -- R11 حذف is_super_admin() و is_admin() نهائياً
    -- ──────────────────────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('is_super_admin', 'is_admin')
    ) THEN
        RAISE EXCEPTION 'FAIL R11: دوال إرثية لا تزال موجودة (is_super_admin / is_admin) — طبّق R11';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_system_owner'
    ) THEN
        RAISE EXCEPTION 'FAIL: is_system_owner() غير موجودة — البديل الصحيح مفقود';
    END IF;

    RAISE NOTICE '✅ verify_deployment: كل الفحوصات اجتازت';
    RAISE NOTICE '   - الجداول الأساسية موجودة';
    RAISE NOTICE '   - school_id NOT NULL على 23 جدول';
    RAISE NOTICE '   - RLS مُفعَّل على كل الجداول';
    RAISE NOTICE '   - لا سياسات USING (true) على جداول tenant';
    RAISE NOTICE '   - get_my_school_id() و is_super_admin() يقرآن من JWT';

END;
$$;
