-- ============================================================
-- R11: إسقاط الدوال الإرثية is_super_admin() و is_admin()
-- ============================================================
-- السياق المعماري:
--   - الدور الإداري الأعلى الرسمي الوحيد: system_owner
--   - is_system_owner() → الدالة الصحيحة المعتمدة (تبقى)
--   - is_super_admin() → ملوثة معمارياً، تُحذف نهائياً
--   - is_admin()       → ملوثة معمارياً، تُحذف نهائياً
--
-- الجولة الأولى كشفت 7 سياسات إرثية تعتمد على is_admin():
--   z_archive: 5 سياسات — ميتة (R10 أغلق z_archive من authenticated)
--   public.classes: "Admin View All Classes" — إرث 2024، R07 يغطيه
--   public.student_profiles: "Admin View All Students" — إرث 2024، R07 يغطيه
-- ============================================================

BEGIN;

-- ============================================================
-- القسم 1: حذف السياسات الإرثية التي تعتمد على is_admin()
-- ============================================================

-- z_archive.import_runs — سياسات ميتة (authenticated محجوب من z_archive بـ R10)
DROP POLICY IF EXISTS "import_runs_insert" ON z_archive.import_runs;
DROP POLICY IF EXISTS "import_runs_select" ON z_archive.import_runs;
DROP POLICY IF EXISTS "import_runs_update" ON z_archive.import_runs;

-- z_archive.import_run_items — نفس السبب
DROP POLICY IF EXISTS "import_items_insert" ON z_archive.import_run_items;
DROP POLICY IF EXISTS "import_items_select" ON z_archive.import_run_items;

-- public.classes — إرث من 20240123_rbac_security.sql، R07 يغطيه بسياسات JWT حديثة
DROP POLICY IF EXISTS "Admin View All Classes" ON public.classes;

-- public.student_profiles — إرث من 20240123_rbac_security.sql، R07 يغطيه
DROP POLICY IF EXISTS "Admin View All Students" ON public.student_profiles;

-- ============================================================
-- القسم 2: فحص مانع — يتأكد أن لا سياسة إرثية تبقت
-- ============================================================
DO $$
DECLARE
    v_count   integer;
    v_details text;
BEGIN
    SELECT COUNT(*),
           string_agg(
               schemaname || '.' || tablename || ' → ' || policyname,
               E'\n'
           )
    INTO v_count, v_details
    FROM pg_policies
    WHERE qual       ILIKE '%is_admin%'
       OR qual       ILIKE '%is_super_admin%'
       OR with_check ILIKE '%is_admin%'
       OR with_check ILIKE '%is_super_admin%';

    IF v_count > 0 THEN
        RAISE EXCEPTION
            E'HARD STOP: % سياسة إرثية لا تزال موجودة:\n%',
            v_count, v_details;
    END IF;

    RAISE NOTICE '✅ القسم 2: لا سياسات إرثية — الحذف آمن';
END;
$$;

-- ============================================================
-- القسم 3: إسقاط is_super_admin() — كل الـ overloads
-- ============================================================

DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin(text);

-- ============================================================
-- القسم 4: إسقاط is_admin() — كل الـ overloads
-- ============================================================

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_admin(uuid);
DROP FUNCTION IF EXISTS public.is_admin(text);

-- ============================================================
-- التحقق النهائي
-- ============================================================
DO $$
DECLARE
    v_remaining text;
BEGIN
    SELECT string_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')', ', ')
    INTO v_remaining
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('is_super_admin', 'is_admin');

    IF v_remaining IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL R11: الدوال الإرثية لا تزال موجودة: %', v_remaining;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'is_system_owner'
    ) THEN
        RAISE EXCEPTION 'FAIL R11: is_system_owner() غير موجودة — البديل الصحيح مفقود!';
    END IF;

    RAISE NOTICE '✅ R11 اكتمل:';
    RAISE NOTICE '   7 سياسات إرثية — محذوفة';
    RAISE NOTICE '   is_super_admin() — محذوفة نهائياً (كل الـ overloads)';
    RAISE NOTICE '   is_admin()       — محذوفة نهائياً (كل الـ overloads)';
    RAISE NOTICE '   is_system_owner() — موجودة ومعتمدة ✓';
    RAISE NOTICE '   النظام نظيف من التلوث المعماري الإرثي';
END;
$$;

COMMIT;
