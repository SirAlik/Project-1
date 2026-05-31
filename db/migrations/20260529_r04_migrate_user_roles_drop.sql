-- =================================================================
-- R04: ترحيل user_roles → user_personas + حذف user_roles + تنظيف profiles
-- التاريخ: 2026-05-29
-- المشروع: Smart School OS 2.0
-- =================================================================
-- الهدف:
--   1. ترحيل أي بيانات مفيدة من user_roles → user_personas
--      (فقط الصفوف بأدوار صالحة في ENUM school_role_type)
--   2. حذف السياسات على action_audit_log التي تشير لـ user_roles
--      (منع أخطاء runtime بين R04 و R05)
--   3. DROP TABLE user_roles CASCADE
--   4. ALTER TABLE profiles DROP COLUMN role   — عمود legacy بقيمة 'super_admin' المحذوفة
--   5. ALTER TABLE profiles DROP COLUMN school_id — المصدر الصحيح هو JWT فقط (بعد R00)
--
-- ما لا يُحذف هنا:
--   profiles.system_role — عمود حديث أُضيف في identity_forge_phase2
--   profiles.default_persona_id — عمود حديث أُضيف في identity_forge_phase2
--
-- التبعيات:
--   R00 ✅ — get_my_school_id() تقرأ من JWT (لا تعتمد على profiles.school_id بعد الآن)
--   R03 ✅ — لا دوال تشير لـ user_roles
-- =================================================================

BEGIN;

-- ============================================================
-- Preflight A: التحقق من وجود user_personas بالبنية الصحيحة
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_personas'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: user_personas غير موجودة';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'user_personas'
          AND column_name  = 'school_id'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: user_personas.school_id غير موجود';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'user_personas'
          AND column_name  = 'role'
    ) THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: user_personas.role غير موجود';
    END IF;

    RAISE NOTICE 'Preflight A: user_personas موجودة بالبنية الصحيحة ✓';
END $$;

-- ============================================================
-- Preflight B: إحصاء ما سيُرحَّل وما سيُتخطى
-- ============================================================
DO $$
DECLARE
    v_total_roles    integer := 0;
    v_valid_roles    integer := 0;
    v_invalid_roles  integer := 0;
    v_skipped_null   integer := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        RAISE NOTICE 'Preflight B: user_roles غير موجودة — تم حذفها مسبقاً ✓';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_total_roles FROM public.user_roles;

    SELECT COUNT(*) INTO v_valid_roles
    FROM public.user_roles ur
    WHERE ur.school_id IS NOT NULL
      AND ur.role IN (
          SELECT enumlabel::text
          FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
          WHERE pg_type.typname = 'school_role_type'
            AND pg_type.typnamespace = 'public'::regnamespace
      );

    SELECT COUNT(*) INTO v_skipped_null
    FROM public.user_roles WHERE school_id IS NULL;

    v_invalid_roles := v_total_roles - v_valid_roles - v_skipped_null;

    RAISE NOTICE 'Preflight B: user_roles — إجمالي: % | سيُرحَّل: % | متخطى (school_id NULL): % | متخطى (دور غير صالح): %',
        v_total_roles, v_valid_roles, v_skipped_null, v_invalid_roles;
END $$;

-- ============================================================
-- الخطوة 1: ترحيل البيانات user_roles → user_personas
-- ============================================================
-- شروط الترحيل:
--   • school_id NOT NULL — user_personas يتطلب school_id
--   • role يجب أن يكون قيمة صالحة في school_role_type ENUM
--   • ON CONFLICT DO NOTHING — لا نكسر user_personas الحالية
--
-- ملاحظة: الصفوف بدور 'admin'، 'super_admin'، 'system_coordinator'
-- وغيرها من الأدوار غير الصالحة في ENUM ستُتخطى تلقائياً.

DO $$
DECLARE
    v_migrated integer := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) THEN
        RAISE NOTICE 'الخطوة 1: user_roles غير موجودة — تخطي الترحيل';
        RETURN;
    END IF;

    INSERT INTO public.user_personas (user_id, school_id, role, created_at)
    SELECT
        ur.user_id,
        ur.school_id,
        ur.role::public.school_role_type,
        ur.created_at
    FROM public.user_roles ur
    WHERE ur.school_id IS NOT NULL
      AND ur.role IN (
          SELECT enumlabel::text
          FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
          WHERE pg_type.typname     = 'school_role_type'
            AND pg_type.typnamespace = 'public'::regnamespace
      )
    ON CONFLICT (user_id, school_id, role) DO NOTHING;

    GET DIAGNOSTICS v_migrated = ROW_COUNT;
    RAISE NOTICE 'الخطوة 1: رُحِّل % صف من user_roles إلى user_personas', v_migrated;
END $$;

-- ============================================================
-- الخطوة 2: حذف سياسات action_audit_log التي تشير لـ user_roles
-- ============================================================
-- هذه السياسات ستُسبب أخطاء runtime بعد حذف user_roles في الخطوة التالية.
-- سيتم استبدالها بسياسات صحيحة في R05.

DROP POLICY IF EXISTS "super_admin_view_all_audit_logs"    ON public.action_audit_log;
DROP POLICY IF EXISTS "coordinator_view_school_audit_logs" ON public.action_audit_log;

-- ============================================================
-- الخطوة 3: DROP TABLE user_roles CASCADE
-- ============================================================

DROP TABLE IF EXISTS public.user_roles CASCADE;

-- ============================================================
-- الخطوة 4: حذف profiles.role (عمود legacy — قيمته 'super_admin' المحذوفة)
-- ============================================================
-- المصدر الصحيح للدور هو JWT app_metadata.role (بعد R00)

-- CASCADE يحذف تلقائياً السياسات القديمة التي تقرأ profiles.role مباشرة
-- (health_supplies, canteen_checks, hygiene_logs, activity_*, invites)
-- هذه السياسات مكسورة وستُعاد بناؤها بنمط JWT في R06
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- ============================================================
-- الخطوة 5: حذف profiles.school_id (عمود legacy — قيمته NULL)
-- ============================================================
-- المصدر الصحيح لـ school_id هو JWT app_metadata.school_id (بعد R00)

ALTER TABLE public.profiles DROP COLUMN IF EXISTS school_id CASCADE;

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_personas_count   integer;
    v_roles_exists     boolean;
    v_col_role_exists  boolean;
    v_col_sid_exists   boolean;
    v_bad_policies     text;
BEGIN
    -- user_roles يجب أن تكون محذوفة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_roles'
    ) INTO v_roles_exists;

    IF v_roles_exists THEN
        RAISE EXCEPTION 'التحقق فشل: user_roles لا تزال موجودة';
    END IF;

    -- profiles.role يجب أن تكون محذوفة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) INTO v_col_role_exists;

    IF v_col_role_exists THEN
        RAISE EXCEPTION 'التحقق فشل: profiles.role لا يزال موجوداً';
    END IF;

    -- profiles.school_id يجب أن تكون محذوفة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'school_id'
    ) INTO v_col_sid_exists;

    IF v_col_sid_exists THEN
        RAISE EXCEPTION 'التحقق فشل: profiles.school_id لا يزال موجوداً';
    END IF;

    -- التأكد من أن action_audit_log لا تزال لديها السياسات الجيدة
    SELECT string_agg(policyname, ', ') INTO v_bad_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'action_audit_log'
      AND (qual LIKE '%user_roles%' OR with_check LIKE '%user_roles%');

    IF v_bad_policies IS NOT NULL THEN
        RAISE WARNING 'تحذير: سياسات action_audit_log لا تزال تشير لـ user_roles: [%] — راجع R05', v_bad_policies;
    END IF;

    -- إحصاء user_personas الحالية
    SELECT COUNT(*) INTO v_personas_count FROM public.user_personas;

    RAISE NOTICE '✓ user_roles محذوفة نهائياً';
    RAISE NOTICE '✓ profiles.role محذوف — المصدر: JWT app_metadata.role';
    RAISE NOTICE '✓ profiles.school_id محذوف — المصدر: JWT app_metadata.school_id';
    RAISE NOTICE '✓ سياسات action_audit_log المرتبطة بـ user_roles محذوفة (تُستبدل في R05)';
    RAISE NOTICE '✓ user_personas: % شخصية نشطة في النظام', v_personas_count;
    RAISE NOTICE '✓ R04 اكتمل — مصدر الأدوار الوحيد الآن: user_personas + JWT';
END $$;

COMMIT;

-- ============================================================
-- بوابة التحقق السريع (للتشغيل بعد COMMIT)
-- ============================================================
-- SELECT COUNT(*) FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'user_roles';
-- -- يجب: 0
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name IN ('role', 'school_id');
-- -- يجب: 0 صفوف
--
-- SELECT policyname FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'action_audit_log';
-- -- يجب: user_view_own_audit_logs + service_insert_audit_logs (السياستان الجيدتان فقط)
