-- ============================================================
-- verify_after.sql — Post-Migration Verification
-- ============================================================
-- تُشغَّل في Supabase SQL Editor بعد تطبيق المايغريشنز
-- تُوقف التنفيذ فوراً بـ RAISE EXCEPTION عند اكتشاف أي مخالفة
-- ============================================================

DO $$
DECLARE
    v_nullable   integer;
    v_no_rls     integer;
    v_bad_tables text;
BEGIN

    -- ──────────────────────────────────────────────────────────
    -- 1. تحقق: school_id يجب أن يكون NOT NULL على كل الجداول
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name  = 'school_id'
      AND is_nullable  = 'YES'
      AND table_name IN (
          'attendance_scans',
          'cases',
          'case_actions',
          'classroom_metadata',
          'counseling_sessions',
          'employee_leaves',
          'events',
          'health_awareness',
          'health_referrals',
          'health_visits',
          'interventions',
          'lab_bookings',
          'lab_inventory',
          'lrc_books',
          'lrc_loans',
          'lrc_visits',
          'notifications',
          'parent_reports',
          'qa_kpis_daily',
          'secretary_correspondence',
          'student_profiles',
          'student_risk_flags',
          'classes'
      );

    IF v_nullable > 0 THEN
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
    -- 2. تحقق: RLS مُفعَّل على كل الجداول
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_no_rls
    FROM pg_class   c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname IN (
          'attendance_scans',
          'cases',
          'case_actions',
          'classroom_metadata',
          'counseling_sessions',
          'employee_leaves',
          'events',
          'health_awareness',
          'health_referrals',
          'health_visits',
          'interventions',
          'lab_bookings',
          'lab_inventory',
          'lrc_books',
          'lrc_loans',
          'lrc_visits',
          'notifications',
          'parent_reports',
          'qa_kpis_daily',
          'secretary_correspondence',
          'student_profiles',
          'student_risk_flags',
          'classes'
      );

    IF v_no_rls > 0 THEN
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
              'student_profiles','student_risk_flags','classes'
          );
        RAISE EXCEPTION 'FAIL: RLS غير مُفعَّل في: %', v_bad_tables;
    END IF;

    -- ──────────────────────────────────────────────────────────
    -- 3. تحقق: لا توجد سياسة USING (true) على جداول الـ tenant
    -- ──────────────────────────────────────────────────────────
    SELECT COUNT(*) INTO v_nullable
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

    IF v_nullable > 0 THEN
        RAISE EXCEPTION 'FAIL: % سياسة تستخدم USING (true) على جداول tenant', v_nullable;
    END IF;

    RAISE NOTICE '✅ verify_after: كل الفحوصات اجتازت — school_id NOT NULL + RLS مُفعَّل + لا USING(true)';

END;
$$;
