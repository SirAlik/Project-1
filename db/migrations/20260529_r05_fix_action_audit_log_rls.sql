-- =================================================================
-- R05: توحيد سياسات action_audit_log
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   استبدال السياسات المتعارضة / المرجعة لـ user_roles بسياسة SELECT
--   واحدة موحدة تستخدم JWT بالنمط الذهبي.
--
-- السياسات الموجودة قبل هذا الملف:
--   • "super_admin_view_all_audit_logs"    ← حُذفت في R04
--   • "coordinator_view_school_audit_logs" ← حُذفت في R04
--   • "user_view_own_audit_logs"           ← تُحذف هنا + تُدمج في aal_select
--   • "service_insert_audit_logs"          ← تبقى كما هي (صحيحة)
--
-- السياسة الجديدة "aal_select":
--   • system_owner           → يرى جميع السجلات
--   • school_admin / school_principal → يرى سجلات مدرسته (school_id = get_my_school_id())
--   • أي مستخدم مصادق      → يرى سجلاته الخاصة فقط (user_id = auth.uid())
--
-- التبعيات:
--   R04 ✅ (user_roles محذوفة + سياستا user_roles على action_audit_log محذوفتان)
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight: التحقق من وجود action_audit_log
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'action_audit_log'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: action_audit_log غير موجودة';
    END IF;

    -- تأكد أن user_roles محذوفة (R04 ✅)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: user_roles لا تزال موجودة — طبّق R04 أولاً';
    END IF;

    RAISE NOTICE 'Preflight: action_audit_log موجودة + user_roles محذوفة ✓';
END $$;

-- ============================================================
-- حذف جميع سياسات SELECT الموجودة (دفعة واحدة للأمان)
-- ============================================================

DROP POLICY IF EXISTS "user_view_own_audit_logs"           ON public.action_audit_log;
DROP POLICY IF EXISTS "audit_select_policy"                ON public.action_audit_log;
DROP POLICY IF EXISTS "Admin Read: Audit Log"              ON public.action_audit_log;
DROP POLICY IF EXISTS "super_admin_view_all_audit_logs"    ON public.action_audit_log;
DROP POLICY IF EXISTS "coordinator_view_school_audit_logs" ON public.action_audit_log;
DROP POLICY IF EXISTS "aal_select"                         ON public.action_audit_log;

-- ============================================================
-- السياسة الموحدة الجديدة
-- ============================================================

CREATE POLICY "aal_select" ON public.action_audit_log
FOR SELECT TO authenticated
USING (
    -- system_owner: يرى كل السجلات
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'system_owner'
    OR
    -- مديرو المدرسة: يرون سجلات مدرستهم فقط
    (
        school_id = public.get_my_school_id()
        AND (auth.jwt() -> 'app_metadata' ->> 'role') IN (
            'school_admin',
            'school_principal'
        )
    )
    OR
    -- أي مستخدم: يرى سجلاته الخاصة فقط
    user_id = auth.uid()
);

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_select_policies  integer;
    v_bad_policies     text;
    v_policy_names     text;
BEGIN
    -- التحقق من عدد سياسات SELECT (يجب سياسة واحدة فقط: aal_select)
    SELECT COUNT(*) INTO v_select_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'action_audit_log'
      AND cmd        = 'SELECT';

    IF v_select_policies != 1 THEN
        SELECT string_agg(policyname, ', ') INTO v_policy_names
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'action_audit_log'
          AND cmd        = 'SELECT';
        RAISE EXCEPTION 'التحقق فشل: عدد سياسات SELECT = % (المتوقع 1). الموجودة: [%]',
            v_select_policies, v_policy_names;
    END IF;

    -- تأكد من عدم وجود أي سياسة تشير لـ user_roles
    SELECT string_agg(policyname, ', ') INTO v_bad_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'action_audit_log'
      AND (qual LIKE '%user_roles%' OR with_check LIKE '%user_roles%');

    IF v_bad_policies IS NOT NULL THEN
        RAISE EXCEPTION 'التحقق فشل: سياسات لا تزال تشير لـ user_roles: [%]', v_bad_policies;
    END IF;

    -- طباعة الوضع الكامل للسياسات
    SELECT string_agg(policyname || ' (' || cmd || ')', ' | ' ORDER BY cmd, policyname)
    INTO v_policy_names
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'action_audit_log';

    RAISE NOTICE '✓ سياسة SELECT موحدة واحدة على action_audit_log: aal_select';
    RAISE NOTICE '✓ لا سياسات تشير لـ user_roles';
    RAISE NOTICE '✓ السياسات الكاملة الآن: [%]', v_policy_names;
    RAISE NOTICE '✓ R05 اكتمل';
END $$;

COMMIT;

-- ============================================================
-- بوابة التحقق السريع (للتشغيل بعد COMMIT)
-- ============================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'action_audit_log'
-- ORDER BY cmd;
-- -- يجب:
-- --   aal_select            (SELECT) — بدون user_roles
-- --   service_insert_audit_logs (INSERT)
